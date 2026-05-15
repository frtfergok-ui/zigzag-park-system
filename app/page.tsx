"use client";

import { useRef, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  runTransaction,
  getDoc,
  setDoc,
  increment,
} from "firebase/firestore";

import { db } from "@/firebase";

const declaration = {
  ru: `ДЕКЛАРАЦИЯ
СОГЛАСИЯ С ПРАВИЛАМИ
посещения и поведения в детском развлекательном комплексе ZIG ZAG
и обработкой персональных данных.

Подписывая данную декларацию согласия с правилами подтверждаю, что я ознакомлен(а) и согласен(а) с условиями, изложенными в правилах посещения и поведения в детском парке аттракционов ZIG ZAG, доступных для ознакомления на информационном стенде юридических лиц, работающим под брендом «ZIG ZAG» и/или на официальном сайте www.zigzagkids.md комплекса и являющихся неотъемлемой частью настоящей декларации согласия с правилами.

Я, ознакомился с правилами парка развлечений ZIG ZAG и ознакомил(а) с ними своего несовершеннолетнего ребенка (детей) / приемного ребенка (детей), которому (которым) разрешаю находиться в детском развлекательном комплексе и гарантирую, что мой несовершеннолетний ребенок (дети) / приемный ребенок (дети) будет (будут) соблюдать правила, а также принимаю на себя все риски, связанные с соблюдением этих правил и возникновением возможного ущерба.

Подтверждаю, что мой несовершеннолетний ребенок (дети) / приемный ребенок (дети) не страдает(-ют) какими-либо заболеваниями, нет условий, при которых он/она/они не смог(-ла, -ли) бы играть и развлекаться, а если таковые имеются, я проинформировал(а) администрацию детского развлекательного комплекса ZIG ZAG и предоставил(а) все необходимые медицинские заключения.

Я оценил(-а) физические возможности своего ребенка (детей) / приемного ребенка (детей) и беру на себя всю ответственность в случае возможных нарушений здоровья.

Я выражаю свое согласие с тем, что в случае, если мой ребенок (дети) / приемный ребенок (дети) не соблюдает(-ют) правила, родители / опекуны несут полную ответственность, и понимаю, что детский развлекательный комплекс не несет ответственности за возникновение и возмещение какого-либо ущерба, возникшего в результате несоблюдения или ненадлежащего соблюдения правил, небрежного или опасного поведения моего ребенка (моих детей) / приемного ребенка (детей).

Принимаю на себя полную ответственность за ущерб, причиненный моему несовершеннолетнему ребенку (детям) / приемному ребенку (детям), или ущерб, причиненный третьим лицам моим несовершеннолетним ребенком (детьми) / приемным ребенком (детьми), подтверждаю, что разрешаю своему (своим) несовершеннолетнему(-ним) ребенку (детям) / приемному ребенку (детям) посещать детский развлекательный комплекс ZIG ZAG без присмотра сопровождающего при условии, что моему ребенку (детям) исполнилось 7 полных лет.

В целях получения указанной информации, в соответствии с требованиями закона Республики Молдова №133 «О защите персональных данных» от 08.07.2011, подписывая настоящее Согласие я также выражаю свое согласие на передачу моих персональных данных и персональных данных Ребенка/Детей для обработки F.P.C. GALGAN SRL систематизацию, накопление, хранение, обезличивание, использование персональных данных указанных в настоящей декларации.`,

  ro: `DECLARAȚIE
DE ACORD CU REGULAMENTUL
de vizitare și comportament în complexul de divertisment pentru copii ZIG ZAG
și de prelucrare a datelor cu caracter personal.

Prin semnarea prezentei declarații de acord cu regulamentul, confirm că am luat la cunoștință și sunt de acord cu condițiile expuse în Regulamentul de vizitare și comportament în parcul de atracții pentru copii ZIG ZAG, disponibil pentru consultare pe panoul informațional al persoanelor juridice care operează sub brandul „ZIG ZAG” și/sau pe site-ul oficial www.zigzagkids.md al complexului și care formează parte integrantă a prezentei declarații de acord cu regulamentul.

Eu, m-am familiarizat cu regulamentul parcului de distracții ZIG ZAG și l-am prezentat copilului (copiilor) meu (mei) minor(i) / copilului (copiilor) adoptat(i), căruia (cărora) îi autorizez să se afle în complexul de divertisment pentru copii și garantez că copilul (copiii) meu (mei) minor(i) / copilul (copiii) adoptat(i) va (vor) respecta regulamentul, precum și îmi asum toate riscurile legate de respectarea acestui regulament și de producerea eventualelor daune.

Confirm că copilul (copiii) meu (mei) minor(i) / copilul (copiii) adoptat(i) nu suferă de boli, nu există condiții în care el/ea/ei să nu poată juca și se distra, iar dacă asemenea condiții există, am informat administrația complexului de divertisment pentru copii ZIG ZAG și am furnizat toate concluziile medicale necesare.

Am evaluat capacitățile fizice ale copilului (copiilor) meu (mei) / copilului (copiilor) adoptat(i) și îmi asum întreaga responsabilitate în cazul eventualelor afectări ale sănătății.

Îmi exprim acordul că, în cazul în care copilul (copiii) meu (mei) / copilul (copiii) adoptat(i) nu respectă regulamentul, părinții / tutorii au întreaga responsabilitate și înțeleg că complexul de divertisment pentru copii nu este responsabil pentru producerea și despăgubirea oricăror daune rezultate din nerespectarea sau respectarea necorespunzătoare a regulamentului, din comportamentul neglijent sau periculos al copilului (copiilor) meu (mei) / copilului (copiilor) adoptat(i).

Îmi asum întreaga responsabilitate pentru daunele produse copilului (copiilor) meu (mei) minor(i) / copilului (copiilor) adoptat(i), sau daunele produse terților de către copilul (copiii) meu (mei) minor(i) / copilul (copiii) adoptat(i), confirm că îmi autorizez copilul (copiii) minor(i) / copilul (copiii) adoptat(i) să viziteze complexul de divertisment pentru copii ZIG ZAG fără supraveghere, însoțitor, cu condiția ca copilul (copiii) meu (mei) să aibă vârsta de 7 ani.

În vederea obținerii informațiilor menționate, în conformitate cu prevederile Legii Republicii Moldova nr.133 din 08.07.2011 „privind protecția datelor cu caracter personal”, prin semnarea prezentei Declarații de acord, îmi exprim de asemenea consimțământul pentru transmiterea datelor mele cu caracter personal și a datelor cu caracter personal ale Copilului/Copiilor în vederea prelucrării de către F.P.C. GALGAN SRL, inclusiv sistematizarea, acumularea, păstrarea, anonimizarea, utilizarea datelor cu caracter personal indicate în prezenta declarație.`,
};

const text = {
  ru: {
    subtitle: "Регистрация посетителя",
    parent: "Имя и фамилия родителя латиницей",
    phone: "Телефон (+373...)",
    email: "Email",
    childName: "Имя ребёнка латиницей",
    childAge: "Возраст",
    child1: "Ребёнок 1",
    child2: "Ребёнок 2",
    child3: "Ребёнок 3",
    oldClient: "✅ Вы уже заполняли декларацию. Проверьте данные, согласитесь с правилами и подпишите ещё раз.",
    newClient: "ℹ️ Новый клиент",
    checkClient: "Проверить Family Pass",
    next: "Продолжить",
    back: "Назад",
    declarationTitle: "Декларация согласия",
    agree: "Я ознакомлен(а) и согласен(а) с декларацией",
    signature: "Подпись родителя",
    clear: "Очистить подпись",
    save: "Подписать и сохранить",
    fill: "❌ Заполните данные родителя и минимум одного ребёнка",
    latinParent: "❌ Имя родителя должно быть только латиницей",
    latinChildren: "❌ Имена детей должны быть только латиницей",
    sign: "❌ Поставьте подпись родителя",
    agreeError: "❌ Подтвердите согласие",
    saving: "⏳ Сохраняю...",
    success: "✅ Регистрация успешно сохранена!",
    error: "❌ Ошибка при сохранении",
  },
  ro: {
    subtitle: "Înregistrarea vizitatorului",
    parent: "Numele părintelui cu litere latine",
    phone: "Telefon (+373...)",
    email: "Email",
    childName: "Numele copilului cu litere latine",
    childAge: "Vârsta",
    child1: "Copilul 1",
    child2: "Copilul 2",
    child3: "Copilul 3",
    oldClient: "✅ Ați completat deja declarația. Verificați datele, acceptați regulile și semnați din nou.",
    newClient: "ℹ️ Client nou",
    checkClient: "Verifică Family Pass",
    next: "Continuă",
    back: "Înapoi",
    declarationTitle: "Declarație de acord",
    agree: "Am citit și sunt de acord cu declarația",
    signature: "Semnătura părintelui",
    clear: "Șterge semnătura",
    save: "Semnează și salvează",
    fill: "❌ Completați datele părintelui și cel puțin un copil",
    latinParent: "❌ Numele părintelui trebuie scris cu litere latine",
    latinChildren: "❌ Numele copiilor trebuie scrise cu litere latine",
    sign: "❌ Puneți semnătura",
    agreeError: "❌ Confirmați acordul",
    saving: "⏳ Se salvează...",
    success: "✅ Înregistrarea a fost salvată!",
    error: "❌ Eroare la salvare",
  },
};

export default function Home() {
  const [lang, setLang] = useState<"ru" | "ro">("ru");
  const [step, setStep] = useState<1 | 2>(1);
  const t = text[lang];

  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("+373");
  const [email, setEmail] = useState("");
  const [familyId, setFamilyId] = useState("");

  const [children, setChildren] = useState([
    { name: "", age: "" },
    { name: "", age: "" },
    { name: "", age: "" },
  ]);

  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const latinRegex = /^[A-Za-z\s-]+$/;
  const cleanPhone = phone.replace(/\D/g, "");

  const validChildren = children.filter(
    (child) => child.name.trim() && child.age.trim()
  );

  const updateChild = (index: number, field: "name" | "age", value: string) => {
    const updated = [...children];
    updated[index][field] = value;
    setChildren(updated);
  };

  const checkFamily = async () => {
    if (!cleanPhone || cleanPhone.length < 8) {
      setMessage(t.newClient);
      return;
    }

    const ref = doc(db, "families", cleanPhone);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data: any = snap.data();

      setFamilyId(data.familyId || "");
      setParentName(data.parentName || "");
      setEmail(data.email || "");

      if (data.children?.length) {
        setChildren([
          data.children[0] || { name: "", age: "" },
          data.children[1] || { name: "", age: "" },
          data.children[2] || { name: "", age: "" },
        ]);
      }

      setMessage(t.oldClient);
    } else {
      setFamilyId("");
      setMessage(t.newClient);
    }
  };

  const createDeclarationNumber = async () => {
    const counterRef = doc(db, "counters", "declarations");

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentNumber = counterDoc.exists()
        ? counterDoc.data().number || 0
        : 0;

      const nextNumber = currentNumber + 1;
      transaction.set(counterRef, { number: nextNumber }, { merge: true });

      return `ZZ-${new Date().getFullYear()}-${String(nextNumber).padStart(
        6,
        "0"
      )}`;
    });
  };

  const createFamilyId = async () => {
    if (familyId) return familyId;

    const counterRef = doc(db, "counters", "families");

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentNumber = counterDoc.exists()
        ? counterDoc.data().number || 0
        : 0;

      const nextNumber = currentNumber + 1;
      transaction.set(counterRef, { number: nextNumber }, { merge: true });

      return `ZZ-FAMILY-${String(nextNumber).padStart(6, "0")}`;
    });
  };

  const goNext = () => {
    setMessage("");

    if (!parentName || !phone || !email || validChildren.length === 0) {
      setMessage(t.fill);
      return;
    }

    if (!latinRegex.test(parentName.trim())) {
      setMessage(t.latinParent);
      return;
    }

    for (const child of validChildren) {
      if (!latinRegex.test(child.name.trim())) {
        setMessage(t.latinChildren);
        return;
      }
    }

    setStep(2);
  };

  const getTouchPosition = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getTouchPosition(e);

    isDrawing.current = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getTouchPosition(e);

    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setHasSignature(true);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveData = async () => {
    try {
      setMessage(t.saving);

      if (!agree) {
        setMessage(t.agreeError);
        return;
      }

      if (!hasSignature) {
        setMessage(t.sign);
        return;
      }

      const declarationNumber = await createDeclarationNumber();
      const newFamilyId = await createFamilyId();
      const signature = canvasRef.current!.toDataURL("image/png");

      const savedChildren = validChildren.map((child) => ({
        name: child.name.trim().toUpperCase(),
        age: child.age.trim(),
      }));
if (familyId) {
  await setDoc(
  doc(db, "families", cleanPhone),
  {
    familyId: newFamilyId,
    parentName: parentName.trim().toUpperCase(),
    phone,
    email,
    children: savedChildren,

    lastVisit: new Date(),
    lastAgreedAt: new Date(),
    updatedAt: new Date(),

    lastDeclarationNumber: declarationNumber,
    lastSignature: signature,

    visitsCount: increment(1),

    createdAt: new Date(),
  },
  { merge: true }
);

  setMessage(`${t.success} ${familyId}`);

  setParentName("");
  setPhone("+373");
  setEmail("");
  setFamilyId("");
  setChildren([
    { name: "", age: "" },
    { name: "", age: "" },
    { name: "", age: "" },
  ]);
  setAgree(false);
  clearSignature();
  setStep(1);

  return;
}
      await addDoc(collection(db, "visitors"), {
        declarationNumber,
        familyId: newFamilyId,
        parentName: parentName.trim().toUpperCase(),
        phone,
        phoneVerified: false,
        email,
        children: savedChildren,
        language: lang,
        declarationText: declaration[lang],
        agreed: true,
        signature,
        createdAt: new Date(),
      });

      await setDoc(
        doc(db, "families", cleanPhone),
        {
          familyId: newFamilyId,
          parentName: parentName.trim().toUpperCase(),
          phone,
          email,
          children: savedChildren,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        { merge: true }
      );

      setMessage(`${t.success} № ${declarationNumber}`);

      setParentName("");
      setPhone("+373");
      setEmail("");
      setFamilyId("");
      setChildren([
        { name: "", age: "" },
        { name: "", age: "" },
        { name: "", age: "" },
      ]);
      setAgree(false);
      clearSignature();
      setStep(1);
    } catch (error) {
      console.error(error);
      setMessage(t.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-yellow-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-white/95 rounded-[2rem] shadow-2xl border border-white p-5 md:p-8">
        <div className="relative mb-6">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="ZIG ZAG"
              className="h-24 md:h-32 object-contain drop-shadow-xl"
            />
          </div>

          <div className="absolute top-28 right-4 flex gap-2">
            <button
              type="button"
              onClick={() => setLang("ru")}
              className={`px-4 py-2 rounded-xl text-lg font-bold shadow ${
                lang === "ru"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-black border"
              }`}
            >
              RU
            </button>

            <button
              type="button"
              onClick={() => setLang("ro")}
              className={`px-4 py-2 rounded-xl text-lg font-bold shadow ${
                lang === "ro"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-black border"
              }`}
            >
              RO
            </button>
          </div>
        </div>

        <p className="text-2xl md:text-3xl text-gray-500 text-center mb-7">
          {step === 1 ? t.subtitle : t.declarationTitle}
        </p>

        {step === 1 && (
          <div className="grid gap-4">
            <input
              type="text"
              placeholder={t.parent}
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="p-5 rounded-2xl border-2 text-2xl text-black"
            />

            <input
  type="tel"
  placeholder={t.phone}
  value={phone}
  onChange={(e) => {
    let value = e.target.value;

    if (!value.startsWith("+")) {
      value = "+" + value.replace(/\+/g, "");
    }

    value = "+" + value.slice(1).replace(/\D/g, "");

    if (value.length > 16) {
      value = value.slice(0, 16);
    }

    setPhone(value);
  }}
  className="p-5 rounded-2xl border-2 text-2xl text-black"
/>

            <button
              type="button"
              onClick={checkFamily}
              className="bg-yellow-400 text-black p-5 rounded-2xl text-2xl font-black"
            >
              {t.checkClient}
            </button>

            {familyId && (
              <div className="bg-green-100 text-green-800 p-5 rounded-2xl text-2xl font-bold text-center">
                Family Pass: {familyId}
              </div>
            )}

            <input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-5 rounded-2xl border-2 text-2xl text-black"
            />

            {children.map((child, index) => (
              <div
                key={index}
                className="bg-blue-50 rounded-3xl p-4 grid gap-3"
              >
                <p className="text-2xl font-bold text-black">
                  {index === 0
                    ? t.child1
                    : index === 1
                    ? t.child2
                    : t.child3}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder={t.childName}
                    value={child.name}
                    onChange={(e) =>
                      updateChild(index, "name", e.target.value)
                    }
                    className="p-5 rounded-2xl border-2 text-2xl text-black"
                  />

                  <input
                    type="number"
                    placeholder={t.childAge}
                    value={child.age}
                    onChange={(e) =>
                      updateChild(index, "age", e.target.value)
                    }
                    className="p-5 rounded-2xl border-2 text-2xl text-black"
                  />
                </div>
              </div>
            ))}

            {message && (
              <div className="bg-yellow-100 text-black p-5 rounded-2xl text-2xl text-center font-bold">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={goNext}
              className="bg-blue-600 text-white p-6 rounded-3xl text-3xl font-black"
            >
              {t.next}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5">
            <div className="bg-gray-50 border-2 border-gray-200 rounded-3xl p-5 max-h-[420px] overflow-y-auto text-black text-xl leading-relaxed whitespace-pre-line">
              {declaration[lang]}
            </div>

            <label className="flex items-center gap-4 bg-blue-50 border-2 border-blue-100 rounded-2xl p-5 text-2xl font-bold text-black">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="w-8 h-8"
              />
              {t.agree}
            </label>

            <div className="bg-blue-50 rounded-3xl p-4 border-2 border-blue-100">
              <p className="text-2xl md:text-3xl font-bold text-black mb-3">
                {t.signature}
              </p>

              <canvas
                ref={canvasRef}
                width={900}
                height={320}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full bg-white border-4 border-blue-300 rounded-2xl"
                style={{ touchAction: "none" }}
              />

              <button
                type="button"
                onClick={clearSignature}
                className="mt-4 bg-red-500 text-white p-4 rounded-2xl text-2xl font-bold w-full"
              >
                {t.clear}
              </button>
            </div>

            {message && (
              <div className="p-5 rounded-2xl bg-yellow-100 text-black text-2xl text-center font-bold">
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setStep(1);
                }}
                className="bg-gray-300 text-black p-6 rounded-3xl text-3xl font-black"
              >
                {t.back}
              </button>

              <button
                type="button"
                onClick={saveData}
                className="bg-blue-600 text-white p-6 rounded-3xl text-3xl font-black shadow-xl"
              >
                {t.save}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}