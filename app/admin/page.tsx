"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { db, app } from "@/firebase";

type AdminRole = "owner" | "manager" | "cashier";

export default function AdminPage() {
  const [tab, setTab] = useState<"visitors" | "families">("visitors");
  const [visitors, setVisitors] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<AdminRole>("cashier");

  const auth = getAuth(app);

  const canEdit = adminRole === "owner" || adminRole === "manager";
  const canDelete = adminRole === "owner";
  const canExport = adminRole === "owner" || adminRole === "manager";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const adminRef = doc(db, "admins", user.email || "");
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists()) {
        setAdminRole(adminSnap.data().role || "cashier");
      } else {
        setAdminRole("cashier");
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubVisitors = onSnapshot(collection(db, "visitors"), (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((d) => data.push({ id: d.id, ...d.data() }));

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
    });

    const unsubFamilies = onSnapshot(collection(db, "families"), (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setFamilies(data);
    });

    return () => {
      unsubVisitors();
      unsubFamilies();
    };
  }, []);

  const getDate = (v: any) => {
    const dateValue = v.lastVisit || v.updatedAt || v.createdAt;

    if (!dateValue) return "";

    if (dateValue?.toDate) return dateValue.toDate().toLocaleString();

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

  const startEdit = async (item: any, type: "visitor" | "family") => {
    if (!canEdit) return;

    const parentName = prompt("Родитель:", item.parentName || "");
    if (parentName === null) return;

    const phone = prompt("Телефон:", item.phone || "");
    if (phone === null) return;

    const email = prompt("Email:", item.email || "");
    if (email === null) return;

    const oldChildren = (item.children || [])
      .map((c: any) => `${c.name}:${c.age}`)
      .join(", ");

    const childrenText = prompt(
      "Дети в формате ИМЯ:ВОЗРАСТ, ИМЯ:ВОЗРАСТ",
      oldChildren
    );

    if (childrenText === null) return;

    const children = childrenText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, age] = part.split(":");
        return {
          name: String(name || "").trim().toUpperCase(),
          age: String(age || "").trim(),
        };
      })
      .filter((c) => c.name && c.age);

    await updateDoc(doc(db, type === "visitor" ? "visitors" : "families", item.id), {
      parentName: parentName.trim().toUpperCase(),
      phone,
      email,
      children,
      updatedAt: new Date(),
    });
  };

  const createPDF = (v: any) => {
    const pdf = new jsPDF("p", "mm", "a4");

    pdf.setFontSize(22);
    pdf.text("ZIG ZAG", 15, 18);

    pdf.setFontSize(12);
    pdf.text(`Declaration: ${v.declarationNumber || "-"}`, 15, 30);
    pdf.text(`Family Pass: ${v.familyId || "-"}`, 15, 38);
    pdf.text(`Date: ${getDate(v)}`, 15, 46);

    pdf.setFontSize(16);
    pdf.text("Visitor Information", 15, 60);

    pdf.setFontSize(12);
    pdf.text(`Parent: ${v.parentName || ""}`, 15, 72);
    pdf.text(`Phone: ${v.phone || ""}`, 15, 80);
    pdf.text(`Email: ${v.email || ""}`, 15, 88);
    pdf.text(`Language: ${v.language || ""}`, 15, 96);

    pdf.setFontSize(16);
    pdf.text("Children", 15, 112);

    pdf.setFontSize(12);
    let y = 124;

    (v.children || []).forEach((child: any, index: number) => {
      pdf.text(`${index + 1}. ${child.name} - ${child.age}`, 20, y);
      y += 8;
    });

    pdf.addPage();

    pdf.setFontSize(16);
    pdf.text("Declaration Text", 15, 20);

    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(v.declarationText || "", 180);
    pdf.text(lines, 15, 32);

    if (v.signature) {
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text("Parent Signature", 15, 20);
      pdf.addImage(v.signature, "PNG", 15, 35, 120, 45);
    }

    pdf.save(`${v.declarationNumber || "declaration"}.pdf`);
  };

  const filteredVisitors = visitors.filter((v) => {
    const childrenText = (v.children || [])
      .map((c: any) => `${c.name} ${c.age}`)
      .join(" ");

    return `${v.declarationNumber || ""} ${v.familyId || ""} ${
      v.parentName || ""
    } ${v.phone || ""} ${v.email || ""} ${childrenText}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const filteredFamilies = families.filter((f) => {
    const childrenText = (f.children || [])
      .map((c: any) => `${c.name} ${c.age}`)
      .join(" ");

    return `${f.familyId || ""} ${f.parentName || ""} ${f.phone || ""} ${
      f.email || ""
    } ${childrenText}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const exportExcel = () => {
    if (!canExport) return;

    const data = tab === "visitors" ? filteredVisitors : filteredFamilies;

    const rows = data.map((item) => {
      const children = item.children || [];

      const row: any = {
        "№ декларации": item.declarationNumber || "",
        "Family Pass": item.familyId || "",
        Родитель: item.parentName || "",
        Телефон: item.phone || "",
        Email: item.email || "",
        Дата: getDate(item),
      };

      children.forEach((child: any, index: number) => {
        row[`Ребёнок ${index + 1}`] = child.name || "";
        row[`Возраст ${index + 1}`] = child.age || "";
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      tab === "visitors" ? "Visitors" : "Family Pass"
    );

    XLSX.writeFile(
      wb,
      tab === "visitors" ? "zigzag-visitors.xlsx" : "zigzag-family-pass.xlsx"
    );
  };

  const today = new Date().toDateString();

  const todayVisitors = visitors.filter((v) => {
    if (!v.createdAt) return false;

    const d = v.createdAt?.toDate
      ? v.createdAt.toDate()
      : new Date(v.createdAt);

    return d.toDateString() === today;
  }).length;

  const todayChildren = visitors
    .filter((v) => {
      if (!v.createdAt) return false;

      const d = v.createdAt?.toDate
        ? v.createdAt.toDate()
        : new Date(v.createdAt);

      return d.toDateString() === today;
    })
    .reduce((sum, v) => sum + (v.children?.length || 0), 0);

  const totalFamilyChildren = families.reduce(
    (sum, f) => sum + (f.children?.length || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-3xl font-bold text-black">
        Загрузка админки...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-4xl font-bold text-black">ADMIN PANEL</h1>
          <p className="text-lg text-gray-600 font-bold">Role: {adminRole}</p>
        </div>

        <div className="flex gap-3 flex-col md:flex-row">
          <input
            type="text"
            placeholder="Поиск по номеру, имени, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setTab("visitors")}
          className={`px-6 py-4 rounded-2xl text-2xl font-black ${
            tab === "visitors"
              ? "bg-blue-600 text-white"
              : "bg-white text-black border"
          }`}
        >
          Регистрации
        </button>

        <button
          onClick={() => setTab("families")}
          className={`px-6 py-4 rounded-2xl text-2xl font-black ${
            tab === "families"
              ? "bg-green-600 text-white"
              : "bg-white text-black border"
          }`}
        >
          Family Pass
        </button>
      </div>

      {tab === "visitors" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Регистраций</p>
              <p className="text-5xl font-bold text-black">{visitors.length}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Сегодня</p>
              <p className="text-5xl font-bold text-black">{todayVisitors}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Детей сегодня</p>
              <p className="text-5xl font-bold text-black">{todayChildren}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Найдено</p>
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
                  <p className="text-xl font-bold text-black mb-2">👶 Дети:</p>

                  {(v.children || []).map((child: any, index: number) => (
                    <p key={index} className="text-xl text-black">
                      {index + 1}. <b>{child.name}</b> — {child.age} лет
                    </p>
                  ))}
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
                    canEdit && canDelete ? "grid-cols-3" : "grid-cols-1"
                  }`}
                >
                  <button
                    onClick={() => createPDF(v)}
                    className="bg-green-600 text-white p-3 rounded-xl text-xl font-bold"
                  >
                    PDF
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => startEdit(v, "visitor")}
                      className="bg-yellow-500 text-black p-3 rounded-xl text-xl font-bold"
                    >
                      Редактировать
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => deleteVisitor(v.id)}
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
              <p className="text-gray-500 text-xl">Family Pass</p>
              <p className="text-5xl font-bold text-black">{families.length}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Найдено</p>
              <p className="text-5xl font-bold text-black">
                {filteredFamilies.length}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Детей</p>
              <p className="text-5xl font-bold text-black">
                {totalFamilyChildren}
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
                  <p className="text-xl font-bold text-black mb-2">👶 Дети:</p>

                  {(f.children || []).map((child: any, index: number) => (
                    <p key={index} className="text-xl text-black">
                      {index + 1}. <b>{child.name}</b> — {child.age} лет
                    </p>
                  ))}
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
                      canEdit && canDelete ? "grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    {canEdit && (
                      <button
                        onClick={() => startEdit(f, "family")}
                        className="bg-yellow-500 text-black p-3 rounded-xl text-xl font-bold"
                      >
                        Редактировать
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => deleteFamily(f.id)}
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
    </div>
  );
}