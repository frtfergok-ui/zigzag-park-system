"use client";

import html2canvas from "html2canvas";
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

  const [editOpen, setEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<"visitor" | "family" | "">("");
  const [editingId, setEditingId] = useState("");
  const [editData, setEditData] = useState<any>({
    parentName: "",
    phone: "",
    email: "",
    children: [{ name: "", age: "" }],
  });

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

      data.sort((a, b) => {
        const da = a.lastVisit?.toDate
          ? a.lastVisit.toDate()
          : new Date(a.lastVisit || a.updatedAt || 0);

        const dbb = b.lastVisit?.toDate
          ? b.lastVisit.toDate()
          : new Date(b.lastVisit || b.updatedAt || 0);

        return dbb.getTime() - da.getTime();
      });

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

  const startEdit = (item: any, type: "visitor" | "family") => {
    if (!canEdit) return;

    setEditingType(type);
    setEditingId(item.id);
    setEditData({
      parentName: item.parentName || "",
      phone: item.phone || "",
      email: item.email || "",
      children: item.children?.length
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
    setEditData({ ...editData, children: updated });
  };

  const addEditChild = () => {
    setEditData({
      ...editData,
      children: [...editData.children, { name: "", age: "" }],
    });
  };

  const removeEditChild = (index: number) => {
    if (editData.children.length === 1) return;

    setEditData({
      ...editData,
      children: editData.children.filter((_: any, i: number) => i !== index),
    });
  };

  const saveEdit = async () => {
    if (!canEdit) return;

    const collectionName = editingType === "visitor" ? "visitors" : "families";

    await updateDoc(doc(db, collectionName, editingId), {
      parentName: editData.parentName.trim().toUpperCase(),
      phone: editData.phone,
      email: editData.email,
      children: editData.children
        .map((c: any) => ({
          name: String(c.name || "").trim().toUpperCase(),
          age: String(c.age || "").trim(),
        }))
        .filter((c: any) => c.name && c.age),
      updatedAt: new Date(),
    });

    closeEdit();
  };

  const createPDF = async (v: any) => {
  const children = v.children || [];
  const declarationNumber = v.declarationNumber || `ZZ-${Date.now()}`;
  const date = getDate(v);

  const ruText = `ДЕКЛАРАЦИЯ СОГЛАСИЯ С ПРАВИЛАМИ

посещения и поведения в детском развлекательном комплексе ZIG ZAG
и обработкой персональных данных.

Подписывая данную декларацию согласия с правилами подтверждаю, что я ознакомлен(а) и согласен(а) с условиями, изложенными в правилах посещения и поведения в детском парке аттракционов ZIG ZAG, доступных для ознакомления на информационном стенде юридических лиц, работающим под брендом «ZIG ZAG» и/или на официальном сайте www.zigzagkids.md комплекса и являющихся неотъемлемой частью настоящей декларации согласия с правилами.

Я ознакомился(ась) с правилами парка развлечений ZIG ZAG и ознакомил(а) с ними своего несовершеннолетнего ребенка / детей, которому / которым разрешаю находиться в детском развлекательном комплексе и гарантирую соблюдение правил.

Подтверждаю, что ребенок / дети не страдает(-ют) заболеваниями, препятствующими игре и развлечениям. Я принимаю на себя ответственность за возможные риски, связанные с посещением комплекса.

В соответствии с Законом Республики Молдова №133 «О защите персональных данных», выражаю согласие на обработку персональных данных.`;

  const roText = `DECLARAȚIE DE ACORD CU REGULAMENTUL

de vizitare și comportament în complexul de divertisment pentru copii ZIG ZAG
și de prelucrare a datelor cu caracter personal.

Prin semnarea prezentei declarații confirm că am luat cunoștință și sunt de acord cu condițiile expuse în Regulamentul de vizitare și comportament în parcul de atracții pentru copii ZIG ZAG, disponibil pe panoul informațional și/sau pe site-ul oficial www.zigzagkids.md.

Confirm că am prezentat regulamentul copilului / copiilor mei și garantez că acesta / aceștia vor respecta regulamentul complexului.

Confirm că copilul / copiii nu suferă de boli care ar împiedica participarea la activități. Îmi asum responsabilitatea pentru eventualele riscuri legate de vizitarea complexului.

În conformitate cu Legea Republicii Moldova nr.133 privind protecția datelor cu caracter personal, îmi exprim consimțământul pentru prelucrarea datelor personale.`;

  const html = document.createElement("div");
  html.style.position = "fixed";
  html.style.left = "-9999px";
  html.style.top = "0";
  html.style.width = "794px";
  html.style.background = "#ffffff";

  html.innerHTML = `
    <div style="width:794px;font-family:Arial,sans-serif;color:#111827;background:#fff;">

      <section style="width:794px;height:1123px;position:relative;background:linear-gradient(180deg,#eaf4ff 0%,#ffffff 45%);overflow:hidden;">
        <div style="position:absolute;top:-120px;right:-120px;width:330px;height:330px;background:#facc15;border-radius:50%;opacity:.9;"></div>
        <div style="position:absolute;bottom:-150px;left:-130px;width:360px;height:360px;background:#93c5fd;border-radius:50%;opacity:.45;"></div>

        <div style="height:20px;background:#2563eb;"></div>

        <div style="position:relative;padding:38px 54px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <img src="/logo.png" style="width:245px;max-height:125px;object-fit:contain;" />

            <div style="text-align:right;background:white;border:2px solid #dbeafe;border-radius:22px;padding:16px 20px;box-shadow:0 12px 25px rgba(0,0,0,.08);">
              <div style="font-size:13px;color:#64748b;font-weight:800;">DECLARATION №</div>
              <div style="font-size:24px;color:#2563eb;font-weight:900;">${declarationNumber}</div>
              <div style="font-size:13px;color:#64748b;margin-top:6px;">${date}</div>
            </div>
          </div>

          <div style="margin-top:38px;background:#2563eb;color:white;border-radius:28px;padding:26px 30px;box-shadow:0 18px 38px rgba(37,99,235,.28);">
            <div style="font-size:38px;font-weight:900;line-height:1.1;">ZIG ZAG Visitor Declaration</div>
            <div style="font-size:17px;opacity:.95;margin-top:8px;">Registration / Family Pass / Consent form</div>
          </div>

          <div style="margin-top:34px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
            <div style="background:white;border:2px solid #dbeafe;border-radius:24px;padding:18px 20px;">
              <div style="font-size:13px;color:#64748b;font-weight:900;">PARENT</div>
              <div style="font-size:24px;font-weight:900;margin-top:7px;">${v.parentName || ""}</div>
            </div>

            <div style="background:white;border:2px solid #dbeafe;border-radius:24px;padding:18px 20px;">
              <div style="font-size:13px;color:#64748b;font-weight:900;">PHONE</div>
              <div style="font-size:24px;font-weight:900;margin-top:7px;">${v.phone || ""}</div>
            </div>

            <div style="background:white;border:2px solid #dbeafe;border-radius:24px;padding:18px 20px;">
              <div style="font-size:13px;color:#64748b;font-weight:900;">EMAIL</div>
              <div style="font-size:21px;font-weight:900;margin-top:7px;">${v.email || ""}</div>
            </div>

            <div style="background:white;border:2px solid #dbeafe;border-radius:24px;padding:18px 20px;">
              <div style="font-size:13px;color:#64748b;font-weight:900;">FAMILY PASS</div>
              <div style="font-size:21px;font-weight:900;margin-top:7px;">${v.familyId || "-"}</div>
            </div>
          </div>

          <div style="margin-top:38px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
              <div style="width:12px;height:36px;background:#facc15;border-radius:20px;"></div>
              <div style="font-size:32px;font-weight:900;color:#111827;">Children</div>
            </div>

            <table style="width:100%;border-collapse:separate;border-spacing:0 11px;font-size:18px;">
              <thead>
                <tr>
                  <th style="background:#2563eb;color:white;padding:13px;border-radius:16px 0 0 16px;">№</th>
                  <th style="background:#2563eb;color:white;padding:13px;">Name</th>
                  <th style="background:#2563eb;color:white;padding:13px;border-radius:0 16px 16px 0;">Age</th>
                </tr>
              </thead>
              <tbody>
                ${
                  children.length
                    ? children.map((c: any, i: number) => `
                      <tr>
                        <td style="background:#f8fafc;padding:15px;text-align:center;font-weight:900;border-radius:16px 0 0 16px;">${i + 1}</td>
                        <td style="background:#f8fafc;padding:15px;font-weight:900;">${c.name || ""}</td>
                        <td style="background:#f8fafc;padding:15px;font-weight:900;border-radius:0 16px 16px 0;">${c.age || ""}</td>
                      </tr>
                    `).join("")
                    : `<tr><td colspan="3" style="background:#f8fafc;padding:16px;text-align:center;border-radius:16px;">No children</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>

        <div style="position:absolute;left:0;right:0;bottom:0;background:#2563eb;color:white;padding:16px;text-align:center;font-size:17px;font-weight:900;">
          ZIG ZAG KIDS PARK · VISITOR DECLARATION
        </div>
      </section>

      <section style="width:794px;min-height:1123px;background:#ffffff;page-break-before:always;position:relative;">
        <div style="height:20px;background:#2563eb;"></div>

        <div style="padding:30px 50px 95px 50px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <img src="/logo.png" style="width:170px;max-height:90px;object-fit:contain;" />

            <div style="text-align:right;color:#475569;font-size:14px;line-height:1.5;">
              <b style="color:#111827;">${declarationNumber}</b><br/>
              ${date}
            </div>
          </div>

          <div style="text-align:center;margin-bottom:20px;">
            <div style="font-size:30px;color:#111827;font-weight:900;">Декларация / Declarație</div>
            <div style="height:5px;width:150px;background:#facc15;margin:13px auto 0 auto;border-radius:20px;"></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
            <div style="border:2px solid #dbeafe;background:#f8fbff;border-radius:22px;padding:18px;font-size:12.5px;line-height:1.45;text-align:justify;white-space:pre-line;">
              ${ruText}
            </div>

            <div style="border:2px solid #dbeafe;background:#f8fbff;border-radius:22px;padding:18px;font-size:12.5px;line-height:1.45;text-align:justify;white-space:pre-line;">
              ${roText}
            </div>
          </div>

          <div style="margin-top:24px;display:grid;grid-template-columns:1fr 240px;gap:26px;align-items:end;">
            <div>
              <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:10px;">Parent Signature / Semnătura</div>
              <div style="height:118px;border:3px dashed #94a3b8;border-radius:22px;background:#fff;display:flex;align-items:center;justify-content:center;">
                ${
                  v.signature
                    ? `<img src="${v.signature}" style="max-width:330px;max-height:96px;object-fit:contain;" />`
                    : ""
                }
              </div>
            </div>

            <div style="background:#eff6ff;border:2px solid #dbeafe;border-radius:22px;padding:18px;font-size:14px;color:#475569;line-height:1.5;">
              <b style="color:#111827;">Parent:</b><br/>
              ${v.parentName || ""}<br/><br/>
              <b style="color:#111827;">Date:</b><br/>
              ${date}
            </div>
          </div>
        </div>

        <div style="position:absolute;left:0;right:0;bottom:0;background:#2563eb;color:white;padding:17px 42px;font-size:17px;text-align:center;font-weight:900;">
          THANK YOU FOR CHOOSING ZIG ZAG KIDS PARK
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
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${declarationNumber}-${v.parentName || "visitor"}.pdf`);
};;

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

  const totalChildren = visitors.reduce(
    (sum, v) => sum + (v.children?.length || 0),
    0
  );

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
              {editData.children.map((child: any, index: number) => (
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
                        onClick={() => removeEditChild(index)}
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
                        updateEditChild(index, "name", e.target.value)
                      }
                      placeholder="Имя ребёнка"
                      className="p-4 rounded-2xl border text-2xl text-black"
                    />

                    <input
                      value={child.age}
                      onChange={(e) =>
                        updateEditChild(index, "age", e.target.value)
                      }
                      placeholder="Возраст"
                      className="p-4 rounded-2xl border text-2xl text-black"
                    />
                  </div>
                </div>
              ))}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Регистраций</p>
              <p className="text-5xl font-bold text-black">
                {visitors.length}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Сегодня</p>
              <p className="text-5xl font-bold text-black">
                {todayVisitors}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Детей сегодня</p>
              <p className="text-5xl font-bold text-black">
                {todayChildren}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Всего детей</p>
              <p className="text-5xl font-bold text-black">
                {totalChildren}
              </p>
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
                  <p className="text-xl font-bold text-black mb-2">
                    👶 Дети:
                  </p>

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
                    canEdit && canDelete
                      ? "grid-cols-3"
                      : canEdit || canDelete
                      ? "grid-cols-2"
                      : "grid-cols-1"
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
              <p className="text-5xl font-bold text-black">
                {families.length}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Детей</p>
              <p className="text-5xl font-bold text-black">
                {totalFamilyChildren}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border">
              <p className="text-gray-500 text-xl">Найдено</p>
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
                      canEdit && canDelete
                        ? "grid-cols-2"
                        : "grid-cols-1"
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
