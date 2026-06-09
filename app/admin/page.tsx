"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { db, app } from "@/firebase";

type AdminRole = "owner" | "manager" | "cashier";

export default function AdminPage() {
  const [tab, setTab] =
  useState<"visitors" | "families" | "stats">(
    "visitors"
  );

  const [visitors, setVisitors] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [adminRole, setAdminRole] =
    useState<AdminRole>("cashier");

  const [editOpen, setEditOpen] = useState(false);

  const [editingType, setEditingType] =
    useState<"visitor" | "family" | "">("");

  const [editingId, setEditingId] = useState("");

  const [editData, setEditData] = useState<any>({
    parentName: "",
    phone: "",
    email: "",
    children: [{ name: "", age: "" }],
  });

  const auth = getAuth(app);

  const canEdit =
    adminRole === "owner" ||
    adminRole === "manager";

  const canDelete = adminRole === "owner";

const canExport =
  adminRole === "owner" ||
  adminRole === "manager";

const canViewStats =
  adminRole === "owner";
  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          window.location.href = "/login";
          return;
        }

        const adminRef = doc(
          db,
          "admins",
          user.email || ""
        );

        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          setAdminRole(
            adminSnap.data().role || "cashier"
          );
        }
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubVisitors = onSnapshot(
  query(
    collection(db, "visitors"),
    orderBy("createdAt", "desc"),
    limit(50)
  ),
      (snapshot) => {
        const data: any[] = [];

        snapshot.forEach((d) =>
          data.push({
            id: d.id,
            ...d.data(),
          })
        );

        data.sort((a, b) => {
          const da = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);

          const dbb = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);

          return dbb.getTime() - da.getTime();
        });

        setVisitors(data);
        setLoading(false);
      }
    );

    const unsubFamilies = onSnapshot(
  query(
    collection(db, "families"),
    orderBy("updatedAt", "desc"),
    limit(50)
  ),
      (snapshot) => {
        const data: any[] = [];

        snapshot.forEach((d) =>
          data.push({
            id: d.id,
            ...d.data(),
          })
        );

        setFamilies(data);
      }
    );

    return () => {
      unsubVisitors();
      unsubFamilies();
    };
  }, []);

  const getDate = (v: any) => {
    const dateValue =
      v.lastVisit ||
      v.updatedAt ||
      v.createdAt;

    if (!dateValue) return "";

    if (dateValue?.toDate) {
      return dateValue
        .toDate()
        .toLocaleString();
    }

    return new Date(dateValue).toLocaleString();
  };

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const deleteVisitor = async (id: string) => {
    if (!canDelete) return;

    await deleteDoc(doc(db, "visitors", id));
  };

  const deleteFamily = async (id: string) => {
    if (!canDelete) return;

    await deleteDoc(doc(db, "families", id));
  };

  const startEdit = (
    item: any,
    type: "visitor" | "family"
  ) => {
    if (!canEdit) return;

    setEditingType(type);

    setEditingId(item.id);

    setEditData({
      parentName: item.parentName || "",
      phone: item.phone || "",
      email: item.email || "",
      children:
        item.children?.length
          ? item.children
          : [{ name: "", age: "" }],
    });

    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);

    setEditingId("");

    setEditingType("");

    setEditData({
      parentName: "",
      phone: "",
      email: "",
      children: [{ name: "", age: "" }],
    });
  };

  const updateEditChild = (
    index: number,
    field: "name" | "age",
    value: string
  ) => {
    const updated = [...editData.children];

    updated[index][field] = value;

    setEditData({
      ...editData,
      children: updated,
    });
  };

  const addEditChild = () => {
    setEditData({
      ...editData,
      children: [
        ...editData.children,
        {
          name: "",
          age: "",
        },
      ],
    });
  };

  const removeEditChild = (
    index: number
  ) => {
    if (editData.children.length === 1)
      return;

    setEditData({
      ...editData,
      children:
        editData.children.filter(
          (_: any, i: number) =>
            i !== index
        ),
    });
  };

  const saveEdit = async () => {
    if (!canEdit) return;

    const collectionName =
      editingType === "visitor"
        ? "visitors"
        : "families";

    await updateDoc(
      doc(db, collectionName, editingId),
      {
        parentName:
          editData.parentName
            .trim()
            .toUpperCase(),

        phone: editData.phone,

        email: editData.email,

        children: editData.children
          .map((c: any) => ({
            name: String(
              c.name || ""
            )
              .trim()
              .toUpperCase(),

            age: String(
              c.age || ""
            ).trim(),
          }))
          .filter(
            (c: any) =>
              c.name && c.age
          ),

        updatedAt: new Date(),
      }
    );

    closeEdit();
  };

  const createPDF = async (
    v: any,
    lang: "ru" | "ro"
  ) => {
    const children = v.children || [];

    const declarationNumber =
      v.declarationNumber ||
      `ZZ-${Date.now()}`;

    const date = getDate(v);

    const declarationText =
      lang === "ru"
        ? v.declarationTextRu ||
          v.declarationText ||
          ""
        : v.declarationTextRo ||
          v.declarationText ||
          "";

    const html =
      document.createElement("div");

    html.style.position = "fixed";
    html.style.left = "-9999px";
    html.style.top = "0";
    html.style.width = "794px";
    html.style.background = "#ffffff";

    html.innerHTML = `
      <div style="width:794px;font-family:Arial,sans-serif;background:white;color:#111827;">

        <section style="width:794px;min-height:1123px;padding:40px;background:white;">

          <div style="display:flex;justify-content:space-between;align-items:center;">

            <img
              src="/logo.png"
              style="width:230px;object-fit:contain;"
            />

            <div
              style="
                background:#eff6ff;
                padding:16px 20px;
                border-radius:20px;
                border:2px solid #bfdbfe;
                text-align:right;
              "
            >
              <div style="font-size:13px;color:#64748b;font-weight:800;">
                DECLARATION
              </div>

              <div style="font-size:25px;font-weight:900;color:#2563eb;">
                ${declarationNumber}
              </div>

              <div style="font-size:14px;color:#475569;margin-top:5px;">
                ${date}
              </div>
            </div>

          </div>
                    <div
            style="
              margin-top:35px;
              background:#2563eb;
              color:white;
              padding:28px;
              border-radius:28px;
            "
          >
            <div style="font-size:36px;font-weight:900;">
              ZIG ZAG Visitor Declaration
            </div>

            <div style="font-size:17px;margin-top:8px;">
              ${lang === "ru" ? "Декларация согласия" : "Declarație de acord"}
            </div>
          </div>

          <div
            style="
              margin-top:30px;
              display:grid;
              grid-template-columns:1fr 1fr;
              gap:16px;
            "
          >
            <div style="border:2px solid #dbeafe;border-radius:22px;padding:16px;">
              <div style="font-size:13px;color:#64748b;font-weight:900;">PARENT</div>
              <div style="font-size:22px;font-weight:900;margin-top:6px;">${v.parentName || ""}</div>
            </div>

            <div style="border:2px solid #dbeafe;border-radius:22px;padding:16px;">
              <div style="font-size:13px;color:#64748b;font-weight:900;">PHONE</div>
              <div style="font-size:22px;font-weight:900;margin-top:6px;">${v.phone || ""}</div>
            </div>

            <div style="border:2px solid #dbeafe;border-radius:22px;padding:16px;">
              <div style="font-size:13px;color:#64748b;font-weight:900;">EMAIL</div>
              <div style="font-size:20px;font-weight:900;margin-top:6px;">${v.email || ""}</div>
            </div>

            <div style="border:2px solid #dbeafe;border-radius:22px;padding:16px;">
              <div style="font-size:13px;color:#64748b;font-weight:900;">FAMILY PASS</div>
              <div style="font-size:20px;font-weight:900;margin-top:6px;">${v.familyId || "-"}</div>
            </div>
          </div>

          <div style="margin-top:34px;">
            <div style="font-size:28px;font-weight:900;margin-bottom:14px;">
              Children
            </div>

            <table style="width:100%;border-collapse:separate;border-spacing:0 10px;font-size:17px;">
              <thead>
                <tr>
                  <th style="background:#2563eb;color:white;padding:12px;border-radius:14px 0 0 14px;">№</th>
                  <th style="background:#2563eb;color:white;padding:12px;">Name</th>
                  <th style="background:#2563eb;color:white;padding:12px;border-radius:0 14px 14px 0;">Age</th>
                </tr>
              </thead>

              <tbody>
                ${
                  children.length
                    ? children
                        .map(
                          (c: any, i: number) => `
                            <tr>
                              <td style="background:#f8fafc;padding:14px;text-align:center;font-weight:900;border-radius:14px 0 0 14px;">
                                ${i + 1}
                              </td>

                              <td style="background:#f8fafc;padding:14px;font-weight:900;">
                                ${c.name || ""}
                              </td>

                              <td style="background:#f8fafc;padding:14px;font-weight:900;border-radius:0 14px 14px 0;">
                                ${c.age || ""}
                              </td>
                            </tr>
                          `
                        )
                        .join("")
                    : `
                      <tr>
                        <td colspan="3" style="background:#f8fafc;padding:14px;text-align:center;border-radius:14px;">
                          No children
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>

        </section>

        <section style="width:794px;min-height:1123px;padding:40px;background:white;page-break-before:always;">

          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <img
              src="/logo.png"
              style="width:170px;object-fit:contain;"
            />

            <div style="text-align:right;font-size:14px;color:#475569;">
              <b>${declarationNumber}</b><br/>
              ${date}
            </div>
          </div>

          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:30px;font-weight:900;">
              ${lang === "ru" ? "Декларация согласия" : "Declarație de acord"}
            </div>

            <div
              style="
                height:5px;
                width:150px;
                background:#facc15;
                border-radius:20px;
                margin:12px auto 0 auto;
              "
            ></div>
          </div>

          <div
            style="
              border:2px solid #dbeafe;
              background:#f8fbff;
              border-radius:24px;
              padding:24px;
              font-size:14px;
              line-height:1.55;
              text-align:justify;
              white-space:pre-line;
              min-height:650px;
            "
          >
            ${declarationText}
          </div>

          <div style="margin-top:26px;display:grid;grid-template-columns:1fr 240px;gap:24px;align-items:end;">
            <div>
              <div style="font-size:18px;font-weight:900;margin-bottom:10px;">
                ${lang === "ru" ? "Подпись родителя" : "Semnătura părintelui"}
              </div>

              <div
                style="
                  height:118px;
                  border:3px dashed #94a3b8;
                  border-radius:22px;
                  background:white;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                "
              >
                ${
                  v.signature
                    ? `<img src="${v.signature}" style="max-width:330px;max-height:96px;object-fit:contain;" />`
                    : ""
                }
              </div>
            </div>

            <div
              style="
                background:#eff6ff;
                border:2px solid #dbeafe;
                border-radius:22px;
                padding:18px;
                font-size:14px;
                line-height:1.5;
              "
            >
              <b>Parent:</b><br/>
              ${v.parentName || ""}<br/><br/>

              <b>Date:</b><br/>
              ${date}
            </div>
          </div>

        </section>

      </div>
    `;

    document.body.appendChild(html);

    const canvas = await html2canvas(html, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    document.body.removeChild(html);

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight =
      (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(
      imgData,
      "PNG",
      0,
      position,
      imgWidth,
      imgHeight
    );

    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;

      pdf.addPage();

      pdf.addImage(
        imgData,
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= pageHeight;
    }

    pdf.save(
      `${declarationNumber}-${
        lang === "ru" ? "RU" : "RO"
      }.pdf`
    );
  };

  const filteredVisitors =
    visitors.filter((v) => {
      const childrenText = (v.children || [])
        .map((c: any) => `${c.name} ${c.age}`)
        .join(" ");

      return `${v.declarationNumber || ""} ${
        v.familyId || ""
      } ${v.parentName || ""} ${v.phone || ""} ${
        v.email || ""
      } ${childrenText}`
        .toLowerCase()
        .includes(search.toLowerCase());
    });

  const filteredFamilies =
    families.filter((f) => {
      const childrenText = (f.children || [])
        .map((c: any) => `${c.name} ${c.age}`)
        .join(" ");

      return `${f.familyId || ""} ${
        f.parentName || ""
      } ${f.phone || ""} ${
        f.email || ""
      } ${childrenText}`
        .toLowerCase()
        .includes(search.toLowerCase());
    });

  const exportExcel = () => {
    if (!canExport) return;

    const data =
      tab === "visitors"
        ? filteredVisitors
        : filteredFamilies;

    const rows = data.map((item) => {
      const children = item.children || [];

      const row: any = {
        "№ декларации":
          item.declarationNumber || "",
        "Family Pass": item.familyId || "",
        Родитель: item.parentName || "",
        Телефон: item.phone || "",
        Email: item.email || "",
        Дата: getDate(item),
      };

      children.forEach(
        (child: any, index: number) => {
          row[`Ребёнок ${index + 1}`] =
            child.name || "";
          row[`Возраст ${index + 1}`] =
            child.age || "";
        }
      );

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      tab === "visitors"
        ? "Visitors"
        : "Family Pass"
    );

    XLSX.writeFile(
      wb,
      tab === "visitors"
        ? "zigzag-visitors.xlsx"
        : "zigzag-family-pass.xlsx"
    );
  };

  const today =
    new Date().toDateString();

  const todayVisitors =
    visitors.filter((v) => {
      if (!v.createdAt) return false;

      const d = v.createdAt?.toDate
        ? v.createdAt.toDate()
        : new Date(v.createdAt);

      return d.toDateString() === today;
    }).length;

  const todayChildren =
    visitors
      .filter((v) => {
        if (!v.createdAt) return false;

        const d = v.createdAt?.toDate
          ? v.createdAt.toDate()
          : new Date(v.createdAt);

        return d.toDateString() === today;
      })
      .reduce(
        (sum, v) =>
          sum + (v.children?.length || 0),
        0
      );

  const totalChildren =
    visitors.reduce(
      (sum, v) =>
        sum + (v.children?.length || 0),
      0
    );

  const totalFamilyChildren =
    families.reduce(
      (sum, f) =>
        sum + (f.children?.length || 0),
      0
    );

  const statsMap: any = {};

  visitors.forEach((v) => {
    if (!v.createdAt) return;

    const d = v.createdAt?.toDate
      ? v.createdAt.toDate()
      : new Date(v.createdAt);

    const key = d.toLocaleDateString();

    if (!statsMap[key]) {
      statsMap[key] = {
        date: key,
        visits: 0,
        children: 0,
      };
    }

    statsMap[key].visits += 1;
    statsMap[key].children +=
      v.children?.length || 0;
  });

  const statsData =
    Object.values(statsMap);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-3xl font-bold text-black">
        Загрузка админки...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      {editOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl p-6 grid gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-black">
                Редактирование
              </h2>

              <button
                onClick={closeEdit}
                className="bg-red-500 text-white px-5 py-2 rounded-xl text-2xl font-black"
              >
                ✕
              </button>
            </div>

            <input
              value={editData.parentName}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  parentName: e.target.value,
                })
              }
              placeholder="Родитель"
              className="p-5 rounded-2xl border-2 text-2xl text-black"
            />

            <input
              value={editData.phone}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  phone: e.target.value,
                })
              }
              placeholder="Телефон"
              className="p-5 rounded-2xl border-2 text-2xl text-black"
            />

            <input
              value={editData.email}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  email: e.target.value,
                })
              }
              placeholder="Email"
              className="p-5 rounded-2xl border-2 text-2xl text-black"
            />

            <div className="grid gap-4">
              {editData.children.map(
                (child: any, index: number) => (
                  <div
                    key={index}
                    className="bg-blue-50 rounded-2xl p-4 grid gap-3"
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-2xl font-bold text-black">
                        Ребёнок {index + 1}
                      </p>

                      {editData.children.length > 1 && (
                        <button
                          onClick={() =>
                            removeEditChild(index)
                          }
                          className="bg-red-500 text-white px-5 py-2 rounded-xl text-2xl font-black"
                        >
                          −
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={child.name}
                        onChange={(e) =>
                          updateEditChild(
                            index,
                            "name",
                            e.target.value
                          )
                        }
                        placeholder="Имя ребёнка"
                        className="p-4 rounded-2xl border text-2xl text-black"
                      />

                      <input
                        value={child.age}
                        onChange={(e) =>
                          updateEditChild(
                            index,
                            "age",
                            e.target.value
                          )
                        }
                        placeholder="Возраст"
                        className="p-4 rounded-2xl border text-2xl text-black"
                      />
                    </div>
                  </div>
                )
              )}
            </div>

            <button
              onClick={addEditChild}
              className="bg-green-600 text-white p-5 rounded-2xl text-2xl font-black"
            >
              + Добавить ребёнка
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={closeEdit}
                className="bg-gray-400 text-white p-5 rounded-2xl text-2xl font-black"
              >
                Отмена
              </button>

              <button
                onClick={saveEdit}
                className="bg-blue-600 text-white p-5 rounded-2xl text-2xl font-black"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-4xl font-bold text-black">
            ADMIN PANEL
          </h1>

          <p className="text-lg text-gray-600 font-bold">
            Role: {adminRole}
          </p>
        </div>

        <div className="flex gap-3 flex-col md:flex-row">
          <input
            type="text"
            placeholder="Поиск по номеру, имени, телефону..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="p-3 rounded-xl border text-xl text-black w-full md:w-96"
          />

          {canExport && (
            <button
              onClick={exportExcel}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xl font-bold"
            >
              Excel
            </button>
          )}

          <button
            onClick={logout}
            className="bg-black text-white px-6 py-3 rounded-xl text-xl font-bold"
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">

  <button
    onClick={() => setTab("visitors")}
    className={`px-6 py-4 rounded-2xl text-2xl font-black transition ${
      tab === "visitors"
        ? "bg-blue-600 text-white shadow-lg"
        : "bg-white text-black border-2"
    }`}
  >
    Регистрации
  </button>

  <button
    onClick={() => setTab("families")}
    className={`px-6 py-4 rounded-2xl text-2xl font-black transition ${
      tab === "families"
        ? "bg-green-600 text-white shadow-lg"
        : "bg-white text-black border-2"
    }`}
  >
    Family Pass
  </button>

  {canViewStats && (
    <button
      onClick={() => setTab("stats")}
      className={`px-6 py-4 rounded-2xl text-2xl font-black transition ${
        tab === "stats"
          ? "bg-purple-600 text-white shadow-lg"
          : "bg-white text-black border-2"
      }`}
    >
      Статистика
    </button>
  )}

</div>

      {tab === "visitors" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">
                Регистраций
              </p>
              <p className="text-5xl font-bold text-black">
                {visitors.length}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">
                Сегодня
              </p>
              <p className="text-5xl font-bold text-black">
                {todayVisitors}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">
                Детей сегодня
              </p>
              <p className="text-5xl font-bold text-black">
                {todayChildren}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">
                Всего детей
              </p>
              <p className="text-5xl font-bold text-black">
                {totalChildren}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">
                Найдено
              </p>
              <p className="text-5xl font-bold text-black">
                {filteredVisitors.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredVisitors.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl shadow-md p-5 border"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xl font-black">
                    № {v.declarationNumber || "Без номера"}
                  </span>

                  {v.familyId && (
                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-xl font-black">
                      {v.familyId}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-black">
                  <p className="text-xl">
                    👨 Родитель: <b>{v.parentName}</b>
                  </p>

                  <p className="text-xl">
                    📞 Телефон: <b>{v.phone}</b>
                  </p>

                  <p className="text-xl">
                    📧 Email: <b>{v.email}</b>
                  </p>

                  <p className="text-lg text-gray-500">
                    🌍 Язык: {v.language || "—"}
                  </p>

                  <p className="text-lg text-gray-500">
                    📅 Дата: {getDate(v)}
                  </p>
                </div>

                <div className="mt-4 bg-blue-50 rounded-xl p-4">
                  <p className="text-xl font-bold text-black mb-2">
                    👶 Дети:
                  </p>

                  {(v.children || []).map(
                    (child: any, index: number) => (
                      <p
                        key={index}
                        className="text-xl text-black"
                      >
                        {index + 1}. <b>{child.name}</b> —{" "}
                        {child.age} лет
                      </p>
                    )
                  )}
                </div>

                {v.signature && (
                  <img
                    src={v.signature}
                    alt="signature"
                    className="mt-4 border rounded-xl bg-white w-full max-w-md h-32 object-contain"
                  />
                )}

                <div
                  className={`grid gap-3 mt-4 ${
                    canEdit && canDelete
                      ? "grid-cols-4"
                      : canEdit
                      ? "grid-cols-3"
                      : "grid-cols-2"
                  }`}
                >
                  <button
                    onClick={() =>
                      createPDF(v, "ru")
                    }
                    className="bg-blue-600 text-white p-3 rounded-xl text-xl font-bold"
                  >
                    PDF RU
                  </button>

                  <button
                    onClick={() =>
                      createPDF(v, "ro")
                    }
                    className="bg-green-600 text-white p-3 rounded-xl text-xl font-bold"
                  >
                    PDF RO
                  </button>

                  {canEdit && (
                    <button
                      onClick={() =>
                        startEdit(v, "visitor")
                      }
                      className="bg-yellow-500 text-black p-3 rounded-xl text-xl font-bold"
                    >
                      Редактировать
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() =>
                        deleteVisitor(v.id)
                      }
                      className="bg-red-600 text-white p-3 rounded-xl text-xl font-bold"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "families" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">
                Family Pass
              </p>
              <p className="text-5xl font-bold text-black">
                {families.length}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">
                Детей
              </p>
              <p className="text-5xl font-bold text-black">
                {totalFamilyChildren}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">
                Найдено
              </p>
              <p className="text-5xl font-bold text-black">
                {filteredFamilies.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredFamilies.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-2xl shadow-md p-5 border"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-xl font-black">
                    {f.familyId || "Без Family ID"}
                  </span>

                  {f.lastDeclarationNumber && (
                    <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xl font-black">
                      {f.lastDeclarationNumber}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-black">
                  <p className="text-xl">
                    👨 Родитель: <b>{f.parentName}</b>
                  </p>

                  <p className="text-xl">
                    📞 Телефон: <b>{f.phone}</b>
                  </p>

                  <p className="text-xl">
                    📧 Email: <b>{f.email}</b>
                  </p>

                  <p className="text-lg text-gray-500">
                    📅 Последний визит: {getDate(f)}
                  </p>

                  <p className="text-lg text-gray-500">
                    🔁 Посещений: {f.visitsCount || 0}
                  </p>
                </div>

                <div className="mt-4 bg-green-50 rounded-xl p-4">
                  <p className="text-xl font-bold text-black mb-2">
                    👶 Дети:
                  </p>

                  {(f.children || []).map(
                    (child: any, index: number) => (
                      <p
                        key={index}
                        className="text-xl text-black"
                      >
                        {index + 1}. <b>{child.name}</b> —{" "}
                        {child.age} лет
                      </p>
                    )
                  )}
                </div>

                {f.lastSignature && (
                  <img
                    src={f.lastSignature}
                    alt="signature"
                    className="mt-4 border rounded-xl bg-white w-full max-w-md h-32 object-contain"
                  />
                )}

                {(canEdit || canDelete) && (
                  <div
                    className={`grid gap-3 mt-4 ${
                      canEdit && canDelete
                        ? "grid-cols-2"
                        : "grid-cols-1"
                    }`}
                  >
                    {canEdit && (
                      <button
                        onClick={() =>
                          startEdit(f, "family")
                        }
                        className="bg-yellow-500 text-black p-3 rounded-xl text-xl font-bold"
                      >
                        Редактировать
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() =>
                          deleteFamily(f.id)
                        }
                        className="bg-red-600 text-white p-3 rounded-xl text-xl font-bold"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "stats" && canViewStats && (
  <div className="grid gap-5">

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      <div className="bg-white rounded-2xl p-5 border shadow">
        <p className="text-gray-500 text-xl">
          Всего посещений
        </p>

        <p className="text-5xl font-black text-black">
          {visitors.length}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 border shadow">
        <p className="text-gray-500 text-xl">
          Всего детей
        </p>

        <p className="text-5xl font-black text-black">
          {totalChildren}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 border shadow">
        <p className="text-gray-500 text-xl">
          Family Pass
        </p>

        <p className="text-5xl font-black text-black">
          {families.length}
        </p>
      </div>

    </div>

    <div className="bg-white rounded-3xl p-6 shadow border">
      <h2 className="text-3xl font-black text-black mb-5">
        График посещаемости
      </h2>

      <div style={{ width: "100%", height: 500 }}>
        <ResponsiveContainer>
          <BarChart data={statsData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="visits"
              fill="#2563eb"
              radius={[10, 10, 0, 0]}
            />

            <Bar
              dataKey="children"
              fill="#16a34a"
              radius={[10, 10, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

  </div>
)}
    </div>
  );
}