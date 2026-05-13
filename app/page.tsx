"use client";

import { useRef, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/firebase";

const declaration = {
  ru: `ДЕКЛАРАЦИЯ СОГЛАСИЯ С ПРАВИЛАМИ посещения и поведения в детском развлекательном комплексе ZIG ZAG и обработкой персональных данных.

Подписывая данную декларацию, подтверждаю, что я ознакомлен(а) и согласен(а) с условиями, изложенными в правилах посещения и поведения в детском парке аттракционов ZIG ZAG, доступных на информационном стенде и/или на официальном сайте www.zigzagkids.md.

Я ознакомился(-ась) с правилами парка ZIG ZAG и ознакомил(а) с ними своего несовершеннолетнего ребенка / детей, которым разрешаю находиться в детском развлекательном комплексе.

Подтверждаю, что ребенок / дети не страдают заболеваниями или состояниями, при которых они не могут играть и развлекаться. Если такие имеются, я проинформировал(а) администрацию ZIG ZAG.

Я беру на себя ответственность за состояние здоровья, поведение ребенка / детей и возможный ущерб, причиненный ребенку / детям или третьим лицам.

Также подтверждаю, что разрешаю ребенку / детям посещать ZIG ZAG без сопровождения при условии, что ребенку исполнилось 7 полных лет.

В соответствии с Законом Республики Молдова №133 «О защите персональных данных» от 08.07.2011, я выражаю согласие на обработку моих персональных данных и данных ребенка / детей компанией F.P.C. GALGAN SRL.`,

  ro: `DECLARAȚIE DE ACORD CU REGULILE de vizitare și comportament în complexul de divertisment pentru copii ZIG ZAG și cu prelucrarea datelor cu caracter personal.

Prin semnarea acestei declarații confirm că am luat cunoștință și sunt de acord cu regulile de vizitare și comportament în parcul ZIG ZAG, disponibile pe panoul informativ și/sau pe site-ul oficial www.zigzagkids.md.

Confirm că am citit regulile parcului ZIG ZAG și le-am explicat copilului / copiilor mei minori, cărora le permit să se afle în complexul de divertisment.

Confirm că copilul / copiii mei nu suferă de boli sau afecțiuni care ar împiedica participarea la activități. Dacă există asemenea situații, am informat administrația ZIG ZAG.

Îmi asum responsabilitatea pentru starea de sănătate, comportamentul copilului / copiilor și eventualele daune cauzate copilului / copiilor sau terților.

Confirm că permit copilului / copiilor să viziteze ZIG ZAG fără însoțitor, cu condiția ca acesta / aceștia să fi împlinit vârsta de 7 ani.

În conformitate cu Legea Republicii Moldova nr. 133 privind protecția datelor cu caracter personal din 08.07.2011, îmi exprim acordul pentru prelucrarea datelor mele personale și ale copilului / copiilor de către F.P.C. GALGAN SRL.`,
};

const text = {
  ru: {
    subtitle: "Регистрация посетителя",
    parent: "Имя фамилия родителя",
    phone: "Телефон",
    email: "Email",
    childName: "Имя ребёнка",
    childAge: "Возраст",
    child1: "Ребёнок 1",
    child2: "Ребёнок 2",
    child3: "Ребёнок 3",
    next: "Продолжить",
    back: "Назад",
    declarationTitle: "Декларация согласия",
    agree: "Я ознакомлен(а) и согласен(а) с декларацией",
    signature: "Подпись родителя",
    clear: "Очистить подпись",
    save: "Подписать и сохранить",
    fill: "❌ Заполните данные родителя и минимум одного ребёнка",
    sign: "❌ Поставьте подпись родителя",
    agreeError: "❌ Подтвердите согласие с декларацией",
    saving: "⏳ Сохраняю...",
    success: "✅ Регистрация успешно сохранена!",
    error: "❌ Ошибка при сохранении",
  },
  ro: {
    subtitle: "Înregistrarea vizitatorului",
    parent: "Numele și prenumele părintelui",
    phone: "Telefon",
    email: "Email",
    childName: "Numele copilului",
    childAge: "Vârsta",
    child1: "Copilul 1",
    child2: "Copilul 2",
    child3: "Copilul 3",
    next: "Continuă",
    back: "Înapoi",
    declarationTitle: "Declarație de acord",
    agree: "Am citit și sunt de acord cu declarația",
    signature: "Semnătura părintelui",
    clear: "Șterge semnătura",
    save: "Semnează și salvează",
    fill: "❌ Completați datele părintelui și cel puțin un copil",
    sign: "❌ Puneți semnătura părintelui",
    agreeError: "❌ Confirmați acordul cu declarația",
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
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [children, setChildren] = useState([
    { name: "", age: "" },
    { name: "", age: "" },
    { name: "", age: "" },
  ]);

  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const updateChild = (
    index: number,
    field: "name" | "age",
    value: string
  ) => {
    const updated = [...children];
    updated[index][field] = value;
    setChildren(updated);
  };

  const validChildren = children.filter(
    (child) => child.name.trim() && child.age.trim()
  );

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

  const goNext = () => {
    setMessage("");

    if (!parentName || !phone || !email || validChildren.length === 0) {
      setMessage(t.fill);
      return;
    }

    setStep(2);
  };

  const createDeclarationNumber = async () => {
    const counterRef = doc(db, "counters", "declarations");

    const declarationNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let currentNumber = 0;

      if (counterDoc.exists()) {
        currentNumber = counterDoc.data().number || 0;
      }

      const nextNumber = currentNumber + 1;

      transaction.set(counterRef, { number: nextNumber }, { merge: true });

      const year = new Date().getFullYear();

      return `ZZ-${year}-${String(nextNumber).padStart(6, "0")}`;
    });

    return declarationNumber;
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

      const signature = canvasRef.current!.toDataURL("image/png");
      const declarationNumber = await createDeclarationNumber();

      await addDoc(collection(db, "visitors"), {
        declarationNumber,
        parentName,
        phone,
        email,
        children: validChildren,
        language: lang,
        declarationText: declaration[lang],
        agreed: true,
        signature,
        createdAt: new Date(),
      });

      setMessage(`${t.success} № ${declarationNumber}`);

      setParentName("");
      setPhone("");
      setEmail("");
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

        <div className="text-center mb-7">
          <p className="text-2xl md:text-3xl text-gray-500 mt-2">
            {step === 1 ? t.subtitle : t.declarationTitle}
          </p>
        </div>

        {step === 1 && (
          <div className="grid gap-4">
            <input
              type="text"
              placeholder={t.parent}
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="p-5 md:p-6 rounded-2xl border-2 border-gray-200 text-2xl md:text-3xl text-black outline-none focus:border-blue-500"
            />

            <input
              type="tel"
              placeholder={t.phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="p-5 md:p-6 rounded-2xl border-2 border-gray-200 text-2xl md:text-3xl text-black outline-none focus:border-blue-500"
            />

            <input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-5 md:p-6 rounded-2xl border-2 border-gray-200 text-2xl md:text-3xl text-black outline-none focus:border-blue-500"
            />

            {children.map((child, index) => (
              <div
                key={index}
                className="bg-blue-50 border-2 border-blue-100 rounded-3xl p-4 grid gap-3"
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
                    className="p-5 rounded-2xl border-2 border-gray-200 text-2xl text-black outline-none focus:border-blue-500"
                  />

                  <input
                    type="number"
                    placeholder={t.childAge}
                    value={child.age}
                    onChange={(e) =>
                      updateChild(index, "age", e.target.value)
                    }
                    className="p-5 rounded-2xl border-2 border-gray-200 text-2xl text-black outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ))}

            {message && (
              <div className="p-5 rounded-2xl bg-yellow-100 text-black text-2xl text-center font-bold">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={goNext}
              className="bg-blue-600 text-white p-6 rounded-3xl text-3xl md:text-4xl font-black shadow-xl active:scale-95"
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
                className="mt-4 bg-red-500 text-white p-4 rounded-2xl text-2xl font-bold w-full active:scale-95"
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
                className="bg-gray-300 text-black p-6 rounded-3xl text-3xl font-black active:scale-95"
              >
                {t.back}
              </button>

              <button
                type="button"
                onClick={saveData}
                className="bg-blue-600 text-white p-6 rounded-3xl text-3xl font-black shadow-xl active:scale-95"
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