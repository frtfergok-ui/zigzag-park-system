"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { db, app } from "@/firebase";

export default function AdminPage() {
  const [tab, setTab] = useState<"visitors" | "families">("visitors");
  const [visitors, setVisitors] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const auth = getAuth(app);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) window.location.href = "/login";
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubVisitors = onSnapshot(collection(db, "visitors"), (snapshot) => {
      const data: any[] = [];

      snapshot.forEach((d) => {
        data.push({
          id: d.id,
          ...d.data(),
        });
      });

      data.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dbb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dbb.getTime() - da.getTime();
      });

      setVisitors(data);
      setLoading(false);
    });

    const unsubFamilies = onSnapshot(collection(db, "families"), (snapshot) => {
      const data: any[] = [];

      snapshot.forEach((d) => {
        data.push({
          id: d.id,
          ...d.data(),
        });
      });

      setFamilies(data);
    });

    return () => {
      unsubVisitors();
      unsubFamilies();
    };
  }, []);

  const getDate = (v: any) => {
    if (!v?.createdAt && !v?.updatedAt) return "";

    const dateValue = v.createdAt || v.updatedAt;

    if (dateValue?.toDate) return dateValue.toDate().toLocaleString();

    return new Date(dateValue).toLocaleString();
  };

  const esc = (value: any) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const deleteVisitor = async (id: string) => {
    await deleteDoc(doc(db, "visitors", id));
  };

  const deleteFamily = async (id: string) => {
    await deleteDoc(doc(db, "families", id));
  };

  const createPDF = async (v: any) => {
    const children = v.children || [];
    const declarationNumber = v.declarationNumber || `ZZ-${Date.now()}`;
    const date = getDate(v);

    const html = document.createElement("div");
    html.style.position = "fixed";
    html.style.left = "-9999px";
    html.style.top = "0";
    html.style.width = "794px";
    html.style.background = "#ffffff";

    html.innerHTML = `
      <div style="width:794px; font-family: Arial, sans-serif; color:#111827; background:#fff;">

        <section style="width:794px; height:1123px; position:relative; background:linear-gradient(180deg,#eaf4ff 0%,#ffffff 42%); overflow:hidden;">
          <div style="position:absolute; top:-130px; right:-110px; width:330px; height:330px; background:#facc15; border-radius:50%; opacity:.9;"></div>
          <div style="position:absolute; bottom:-150px; left:-130px; width:360px; height:360px; background:#93c5fd; border-radius:50%; opacity:.45;"></div>

          <div style="height:20px; background:#2563eb;"></div>

          <div style="position:relative; padding:38px 54px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <img src="/logo.png" style="width:245px; max-height:125px; object-fit:contain;" />

              <div style="text-align:right; background:white; border:2px solid #dbeafe; border-radius:22px; padding:16px 20px; box-shadow:0 12px 25px rgba(0,0,0,.08);">
                <div style="font-size:13px; color:#64748b; font-weight:800;">DECLARATION №</div>
                <div style="font-size:24px; color:#2563eb; font-weight:900;">${esc(declarationNumber)}</div>
                <div style="font-size:13px; color:#64748b; margin-top:6px;">${esc(date)}</div>
              </div>
            </div>

            <div style="margin-top:38px; background:#2563eb; color:white; border-radius:28px; padding:26px 30px; box-shadow:0 18px 38px rgba(37,99,235,.28);">
              <div style="font-size:38px; font-weight:900; line-height:1.1;">Visitor Information</div>
              <div style="font-size:17px; opacity:.95; margin-top:8px;">Registration and consent declaration for ZIG ZAG Kids Park</div>
            </div>

            <div style="margin-top:34px; display:grid; grid-template-columns:1fr 1fr; gap:18px;">
              <div style="background:white; border:2px solid #dbeafe; border-radius:24px; padding:18px 20px;">
                <div style="font-size:13px; color:#64748b; font-weight:900;">PARENT</div>
                <div style="font-size:24px; font-weight:900; margin-top:7px;">${esc(v.parentName)}</div>
              </div>

              <div style="background:white; border:2px solid #dbeafe; border-radius:24px; padding:18px 20px;">
                <div style="font-size:13px; color:#64748b; font-weight:900;">PHONE</div>
                <div style="font-size:24px; font-weight:900; margin-top:7px;">${esc(v.phone)}</div>
              </div>

              <div style="background:white; border:2px solid #dbeafe; border-radius:24px; padding:18px 20px;">
                <div style="font-size:13px; color:#64748b; font-weight:900;">EMAIL</div>
                <div style="font-size:21px; font-weight:900; margin-top:7px;">${esc(v.email)}</div>
              </div>

              <div style="background:white; border:2px solid #dbeafe; border-radius:24px; padding:18px 20px;">
                <div style="font-size:13px; color:#64748b; font-weight:900;">FAMILY PASS</div>
                <div style="font-size:21px; font-weight:900; margin-top:7px;">${esc(v.familyId || "-")}</div>
              </div>
            </div>

            <div style="margin-top:38px;">
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                <div style="width:12px; height:36px; background:#facc15; border-radius:20px;"></div>
                <div style="font-size:32px; font-weight:900; color:#111827;">Children</div>
              </div>

              <table style="width:100%; border-collapse:separate; border-spacing:0 11px; font-size:18px;">
                <thead>
                  <tr>
                    <th style="background:#2563eb; color:white; padding:13px; border-radius:16px 0 0 16px;">№</th>
                    <th style="background:#2563eb; color:white; padding:13px;">Name</th>
                    <th style="background:#2563eb; color:white; padding:13px; border-radius:0 16px 16px 0;">Age</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    children.length
                      ? children.map((c: any, i: number) => `
                        <tr>
                          <td style="background:#f8fafc; padding:15px; text-align:center; font-weight:900; border-radius:16px 0 0 16px;">${i + 1}</td>
                          <td style="background:#f8fafc; padding:15px; font-weight:900;">${esc(c.name)}</td>
                          <td style="background:#f8fafc; padding:15px; font-weight:900; border-radius:0 16px 16px 0;">${esc(c.age)}</td>
                        </tr>
                      `).join("")
                      : `<tr><td colspan="3" style="background:#f8fafc; padding:16px; text-align:center; border-radius:16px;">No children</td></tr>`
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div style="position:absolute; left:0; right:0; bottom:0; background:#2563eb; color:white; padding:16px; text-align:center; font-size:17px; font-weight:900;">
            ZIG ZAG KIDS PARK · VISITOR DECLARATION
          </div>
        </section>

        <section style="width:794px; min-height:1123px; position:relative; background:#ffffff; overflow:hidden; page-break-before:always;">
          <div style="height:20px; background:#2563eb;"></div>

          <div style="padding:30px 50px 95px 50px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
              <img src="/logo.png" style="width:170px; max-height:90px; object-fit:contain;" />

              <div style="text-align:right; color:#475569; font-size:14px; line-height:1.5;">
                <b style="color:#111827;">${esc(declarationNumber)}</b><br/>
                ${esc(date)}
              </div>
            </div>

            <div style="text-align:center; margin-bottom:22px;">
              <div style="font-size:34px; color:#111827; font-weight:900;">Declaration of Consent</div>
              <div style="height:5px; width:150px; background:#facc15; margin:13px auto 0 auto; border-radius:20px;"></div>
            </div>

            <div style="
              border:2px solid #dbeafe;
              background:#f8fbff;
              border-radius:24px;
              padding:24px 26px;
              font-size:15px;
              line-height:1.55;
              text-align:justify;
              white-space:pre-line;
              color:#111827;
              min-height:560px;
            ">
              ${esc(v.declarationText || "Declaration text missing.")}
            </div>

            <div style="margin-top:24px; display:grid; grid-template-columns:1fr 240px; gap:26px; align-items:end;">
              <div>
                <div style="font-size:18px; font-weight:900; color:#111827; margin-bottom:10px;">Parent Signature</div>
                <div style="height:118px; border:3px dashed #94a3b8; border-radius:22px; background:#fff; display:flex; align-items:center; justify-content:center;">
                  ${
                    v.signature
                      ? `<img src="${v.signature}" style="max-width:330px; max-height:96px; object-fit:contain;" />`
                      : ""
                  }
                </div>
              </div>

              <div style="background:#eff6ff; border:2px solid #dbeafe; border-radius:22px; padding:18px; font-size:14px; color:#475569; line-height:1.5;">
                <b style="color:#111827;">Parent:</b><br/>
                ${esc(v.parentName)}<br/><br/>
                <b style="color:#111827;">Generated:</b><br/>
                ${esc(date)}
              </div>
            </div>
          </div>

          <div style="position:absolute; left:0; right:0; bottom:0; background:#2563eb; color:white; padding:17px 42px; font-size:17px; text-align:center; font-weight:900;">
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
  };

  const exportExcel = () => {
    const rows = filteredVisitors.map((v) => {
      const children = v.children || [];

      return {
        "№ декларации": v.declarationNumber || "",
        "Family Pass": v.familyId || "",
        Родитель: v.parentName || "",
        Телефон: v.phone || "",
        Email: v.email || "",
        "Ребёнок 1": children[0]?.name || "",
        "Возраст 1": children[0]?.age || "",
        "Ребёнок 2": children[1]?.name || "",
        "Возраст 2": children[1]?.age || "",
        "Ребёнок 3": children[2]?.name || "",
        "Возраст 3": children[2]?.age || "",
        Язык: v.language || "",
        Дата: getDate(v),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visitors");
    XLSX.writeFile(wb, "zigzag-visitors.xlsx");
  };

  const exportFamiliesExcel = () => {
    const rows = filteredFamilies.map((f) => {
      const children = f.children || [];

      return {
        "Family Pass": f.familyId || "",
        Родитель: f.parentName || "",
        Телефон: f.phone || "",
        Email: f.email || "",
        "Ребёнок 1": children[0]?.name || "",
        "Возраст 1": children[0]?.age || "",
        "Ребёнок 2": children[1]?.name || "",
        "Возраст 2": children[1]?.age || "",
        "Ребёнок 3": children[2]?.name || "",
        "Возраст 3": children[2]?.age || "",
        Дата: getDate(f),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Family Pass");
    XLSX.writeFile(wb, "zigzag-family-pass.xlsx");
  };

  const filteredVisitors = visitors.filter((v) => {
    const childrenText = (v.children || [])
      .map((c: any) => `${c.name} ${c.age}`)
      .join(" ");

    return `${v.declarationNumber || ""} ${v.familyId || ""} ${v.parentName || ""} ${v.phone || ""} ${v.email || ""} ${childrenText}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const filteredFamilies = families.filter((f) => {
    const childrenText = (f.children || [])
      .map((c: any) => `${c.name} ${c.age}`)
      .join(" ");

    return `${f.familyId || ""} ${f.parentName || ""} ${f.phone || ""} ${f.email || ""} ${childrenText}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const today = new Date().toDateString();

  const todayVisitors = visitors.filter((v) => {
    if (!v.createdAt) return false;
    const d = v.createdAt?.toDate ? v.createdAt.toDate() : new Date(v.createdAt);
    return d.toDateString() === today;
  }).length;

  const totalChildren = visitors.reduce(
    (sum, v) => sum + (v.children?.length || 0),
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
        <h1 className="text-4xl font-bold text-black">ADMIN PANEL</h1>

        <div className="flex gap-3 flex-col md:flex-row">
          <input
            type="text"
            placeholder="Поиск по номеру, имени, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-3 rounded-xl border text-xl text-black w-full md:w-96"
          />

          <button
            onClick={tab === "visitors" ? exportExcel : exportFamiliesExcel}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xl font-bold"
          >
            Excel
          </button>

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
              <p className="text-gray-500 text-xl">Детей</p>
              <p className="text-5xl font-bold text-black">{totalChildren}</p>
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
              <div key={v.id} className="bg-white rounded-2xl shadow-md p-5 border">
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
                  <p className="text-xl">👨 Родитель: <b>{v.parentName}</b></p>
                  <p className="text-xl">📞 Телефон: <b>{v.phone}</b></p>
                  <p className="text-xl">📧 Email: <b>{v.email}</b></p>
                  <p className="text-lg text-gray-500">🌍 Язык: {v.language || "—"}</p>
                  <p className="text-lg text-gray-500">📅 Дата: {getDate(v)}</p>
                  <p className="text-lg text-gray-500">
                    📱 Телефон проверен: {v.phoneVerified ? "Да" : "Нет"}
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

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => createPDF(v)}
                    className="bg-green-600 text-white p-3 rounded-xl text-xl font-bold"
                  >
                    PDF
                  </button>

                  <button
                    onClick={() => deleteVisitor(v.id)}
                    className="bg-red-600 text-white p-3 rounded-xl text-xl font-bold"
                  >
                    Удалить
                  </button>
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
              <p className="text-gray-500 text-xl">Детей в Family Pass</p>
              <p className="text-5xl font-bold text-black">
                {families.reduce((sum, f) => sum + (f.children?.length || 0), 0)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredFamilies.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl shadow-md p-5 border">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-xl font-black">
                    {f.familyId || "Без Family ID"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-black">
                  <p className="text-xl">👨 Родитель: <b>{f.parentName}</b></p>
                  <p className="text-xl">📞 Телефон: <b>{f.phone}</b></p>
                  <p className="text-xl">📧 Email: <b>{f.email}</b></p>
                  <p className="text-lg text-gray-500">📅 Дата: {getDate(f)}</p>
                </div>

                <div className="mt-4 bg-green-50 rounded-xl p-4">
                  <p className="text-xl font-bold text-black mb-2">👶 Дети:</p>

                  {(f.children || []).map((child: any, index: number) => (
                    <p key={index} className="text-xl text-black">
                      {index + 1}. <b>{child.name}</b> — {child.age} лет
                    </p>
                  ))}
                </div>

                <button
                  onClick={() => deleteFamily(f.id)}
                  className="mt-4 bg-red-600 text-white p-3 rounded-xl text-xl font-bold w-full"
                >
                  Удалить Family Pass
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}