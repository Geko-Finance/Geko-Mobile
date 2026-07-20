import { ArrowUp, Plus, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatMoney,
  getExpenseBreakdown,
  getFinanceSummary,
  getLargestExpense,
} from "@/src/features/finances/data/mock-finance-data";

type ChatMessage = {
  breakdown?: CategoryBreakdownItem[];
  id: string;
  role: "assistant" | "loading" | "user";
  text: string;
};

type AssistantReply = {
  breakdown?: CategoryBreakdownItem[];
  text: string;
};

type CategoryBreakdownItem = {
  amount: string;
  category: string;
  percentage: number;
};

const QUICK_PROMPTS = [
  "Resume mis gastos de hoy",
  "Que puedo ahorrar esta semana?",
  "Analiza mi flujo de caja",
  "Cual fue mi gasto mas alto?",
];

const CONTEXTUAL_QUICK_PROMPTS = {
  ahorro: [
    "Dame un plan de ahorro",
    "Que gastos puedo reducir?",
    "Crea una meta semanal",
    "Compara mis gastos fijos",
  ],
  cashFlow: [
    "Explica mi cash flow",
    "Que ingreso falta?",
    "Como cierro el mes?",
    "Detecta riesgos de liquidez",
  ],
  expenses: [
    "Divide mis gastos por categoria",
    "Cual gasto deberia recortar?",
    "Compara gastos vs ayer",
    "Muestrame gastos recurrentes",
  ],
  general: QUICK_PROMPTS,
  highSpend: [
    "Por que fue tan alto?",
    "Es gasto recurrente?",
    "Comparalo con mi promedio",
    "Ponlo en un presupuesto",
  ],
} satisfies Record<string, string[]>;

const ASSISTANT_REPLIES = {
  ahorro: [
    "Veo una oportunidad clara: no recortes lo esencial, recorta lo repetido. Si mantienes hoy sin egresos y limitas gastos pequenos durante la semana, puedes proteger entre $25 y $40 sin sentirlo demasiado.",
    "Para ahorrar esta semana empezaria con tres reglas simples: pausa compras no planeadas, revisa budgets abiertos como viajes/regalos, y separa cualquier ingreso pequeno apenas entre. Hoy ese +$30.00 podria ir directo a ahorro.",
    "Tu mejor ahorro ahora no parece venir de un gran recorte, sino de evitar fugas pequenas. Te recomiendo poner un limite diario y revisar cualquier gasto mayor a $50 antes de aprobarlo.",
  ],
  cashFlow: [
    "Tu flujo de caja de hoy esta sano: +$30.00 netos. Ingresos: $30.00. Egresos: $0.00. La lectura rapida es positiva, pero todavia falta volumen para saber si es tendencia o solo un buen inicio de dia.",
    "Hoy estas en terreno positivo. Como no hay egresos registrados, cada nuevo gasto movera rapido el balance del dia. Si quieres cerrar fuerte, intenta mantener gastos por debajo de $20.",
    "Cash flow actual: positivo y limpio. No hay salidas hoy, asi que el riesgo no esta en el presente sino en los gastos programados de la semana, especialmente budgets como viajes o regalos.",
  ],
  expenses: [
    "Hoy no tienes gastos registrados. Eso es una buena senal, pero no lo tomaria como conclusion todavia: revisaria si hay gastos pendientes por sincronizar o pagos que suelen entrar mas tarde.",
    "No veo egresos hoy. En la semana, el gasto que mas llama la atencion es Mexico Trip Budget por $450.00. Lo separaria como budget planificado, no como gasto operativo.",
    "Tus gastos de hoy estan en $0.00. Si quieres mantener ese ritmo, evita mover budgets grandes al dia actual y registra cualquier compra pequena para que el analisis no quede ciego.",
  ],
  general: [
    "Puedo ayudarte con una lectura financiera rapida. Por ahora trabajo con datos locales mock, pero ya puedo separar ingresos, egresos, cash flow, tendencias y transacciones relevantes.",
    "Tengo suficiente contexto para darte insights basicos: hoy vas positivo, no hay egresos registrados y el movimiento visible es un ingreso de $30.00. Puedes preguntarme por gastos, ahorro o flujo de caja.",
    "Estoy listo para analizar tu actividad financiera. Si quieres una recomendacion accionable, preguntame por cash flow, gastos mas altos o donde ahorrar esta semana.",
  ],
  highSpend: [
    "El monto mas alto visible es Mexico Trip Budget por $450.00. Lo importante es clasificarlo bien: si era planificado, debe vivir como budget; si fue improvisado, conviene poner alerta para montos similares.",
    "El gasto que destaca es Mexico Trip Budget. No necesariamente es malo, pero si se repite puede distorsionar tu mes. Lo compararia contra tu promedio semanal antes de decidir si recortar.",
    "Veo un gasto grande asociado a viaje. Mi lectura: no lo mezcles con gastos diarios. Separalo como categoria especial para que no parezca que tu consumo normal subio mas de la cuenta.",
  ],
} satisfies Record<ReturnType<typeof getPromptTopic>, string[]>;

const BOTTOM_TAB_OFFSET = 76;
const KEYBOARD_VERTICAL_OFFSET = 0;
const LOADING_REPLY_DELAY_MS = 1200;
const WORD_REVEAL_INTERVAL_MS = 28;

function buildAssistantReply(prompt: string): AssistantReply {
  const normalizedPrompt = prompt.toLowerCase();
  const monthSummary = getFinanceSummary("month");
  const todaySummary = getFinanceSummary("today");
  const breakdown = getExpenseBreakdown("month");
  const topCategory = breakdown[0];
  const secondCategory = breakdown[1];
  const largestExpense = getLargestExpense("month");

  if (
    normalizedPrompt.includes("divide") ||
    normalizedPrompt.includes("categoria") ||
    normalizedPrompt.includes("categor")
  ) {
    const totalExpenses = monthSummary.expenses || 1;
    const categoryBreakdown = breakdown.slice(0, 6).map((item) => ({
      amount: formatMoney(item.amount),
      category: item.category,
      percentage: Math.round((item.amount / totalExpenses) * 100),
    }));

    return {
      breakdown: categoryBreakdown,
      text: `Este mes tus gastos suman ${formatMoney(monthSummary.expenses)}. La mayor carga esta en ${topCategory.category}; ahi revisaria primero si todo es fijo o si hay una parte ajustable.`,
    };
  }

  if (
    normalizedPrompt.includes("recortar") ||
    normalizedPrompt.includes("reducir")
  ) {
    return {
      text: `El primer gasto que revisaria es ${topCategory.category}: ${formatMoney(topCategory.amount)} este mes. No necesariamente lo eliminaria completo; buscaria bajarlo un 10-15%. Despues miraria ${secondCategory.category}, que suma ${formatMoney(secondCategory.amount)}. Esa combinacion podria liberar cerca de ${formatMoney(topCategory.amount * 0.12 + secondCategory.amount * 0.1)} sin tocar tus ingresos.`,
    };
  }

  if (normalizedPrompt.includes("recurrente")) {
    const recurring = breakdown.filter((item) =>
      ["Housing", "Subscriptions", "Health", "Utilities"].includes(item.category)
    );
    const recurringTotal = recurring.reduce((total, item) => total + item.amount, 0);

    return {
      text: `Tus gastos recurrentes visibles suman ${formatMoney(recurringTotal)} este mes. Los principales son ${recurring.map((item) => `${item.category} ${formatMoney(item.amount)}`).join(", ")}. La alerta aqui es que estos gastos se repiten, asi que cualquier recorte pequeno tiene impacto todos los meses.`,
    };
  }

  if (normalizedPrompt.includes("flujo") || normalizedPrompt.includes("cash")) {
    return {
      text: `Tu cash flow del mes esta en ${formatMoney(monthSummary.cashFlow, { signed: true })}. Ingresos: ${formatMoney(monthSummary.income)}. Egresos: ${formatMoney(monthSummary.expenses)}. La lectura es positiva, pero ${topCategory.category} esta consumiendo una parte fuerte del mes. Mantendria el flujo sano poniendo un limite semanal a gastos variables como Dining, Shopping y Travel.`,
    };
  }

  if (normalizedPrompt.includes("alto") || normalizedPrompt.includes("mayor")) {
    return {
      text: `El gasto mas alto del mes es ${largestExpense.title}: ${formatMoney(largestExpense.amount)} en ${largestExpense.category}. Mi recomendacion: tratalo como gasto planificado si era esperado; si fue impulsivo, pon una alerta para cualquier cargo mayor a ${formatMoney(300)}.`,
    };
  }

  if (normalizedPrompt.includes("ahorrar") || normalizedPrompt.includes("ahorro")) {
    return {
      text: `Puedes ahorrar atacando los gastos variables, no los esenciales. Este mes tus egresos son ${formatMoney(monthSummary.expenses)} y el mayor peso esta en ${topCategory.category}. Si reduces 12% de ${topCategory.category} y 10% de ${secondCategory.category}, podrias ahorrar aproximadamente ${formatMoney(topCategory.amount * 0.12 + secondCategory.amount * 0.1)}.`,
    };
  }

  if (
    normalizedPrompt.includes("gasto") ||
    normalizedPrompt.includes("gato") ||
    normalizedPrompt.includes("egreso")
  ) {
    return {
      text: `Hoy tus egresos estan en ${formatMoney(todaySummary.expenses)}, pero en el mes ya llevas ${formatMoney(monthSummary.expenses)}. Los bloques mas importantes son ${topCategory.category} (${formatMoney(topCategory.amount)}) y ${secondCategory.category} (${formatMoney(secondCategory.amount)}). No estas mal, pero si quieres mejorar margen, ahi esta la oportunidad.`,
    };
  }

  const replies = ASSISTANT_REPLIES[getPromptTopic(prompt)];
  const replyIndex =
    prompt.split("").reduce((total, character) => total + character.charCodeAt(0), 0) %
    replies.length;

  return { text: replies[replyIndex] };
}

function getPromptTopic(prompt: string) {
  const normalizedPrompt = prompt.toLowerCase();

  if (normalizedPrompt.includes("ahorrar") || normalizedPrompt.includes("ahorro")) {
    return "ahorro";
  }

  if (normalizedPrompt.includes("flujo") || normalizedPrompt.includes("cash")) {
    return "cashFlow";
  }

  if (normalizedPrompt.includes("alto") || normalizedPrompt.includes("mayor")) {
    return "highSpend";
  }

  if (
    normalizedPrompt.includes("gasto") ||
    normalizedPrompt.includes("gato") ||
    normalizedPrompt.includes("egreso")
  ) {
    return "expenses";
  }

  return "general";
}

function AssistantMessage({
  breakdown,
  onTextUpdate,
  text,
}: {
  breakdown?: CategoryBreakdownItem[];
  onTextUpdate: () => void;
  text: string;
}) {
  const words = text.split(" ");
  const [visibleWordCount, setVisibleWordCount] = useState(0);

  useEffect(() => {
    setVisibleWordCount(0);

    const intervalId = setInterval(() => {
      setVisibleWordCount((currentCount) => {
        const nextCount = Math.min(currentCount + 1, words.length);

        if (nextCount >= words.length) {
          clearInterval(intervalId);
        }

        return nextCount;
      });
      onTextUpdate();
    }, WORD_REVEAL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [onTextUpdate, text, words.length]);

  return (
    <View className="mb-5 px-7">
      <Text className="text-[17px] font-medium leading-6 text-[#E8E8EC]">
        {words.slice(0, visibleWordCount).join(" ")}
      </Text>
      {breakdown && visibleWordCount >= words.length ? (
        <View className="mt-4 overflow-hidden rounded-[20px] border border-white/10 bg-[#1D1D1F]">
          <View className="flex-row border-b border-white/10 px-4 py-3">
            <Text className="flex-1 text-[12px] font-extrabold uppercase text-[#8E8E92]">
              Categoria
            </Text>
            <Text className="w-[86px] text-right text-[12px] font-extrabold uppercase text-[#8E8E92]">
              Monto
            </Text>
          </View>
          {breakdown.map((item, index) => (
            <View
              className={`px-4 py-3 ${
                index === breakdown.length - 1 ? "" : "border-b border-white/10"
              }`}
              key={item.category}
            >
              <View className="flex-row items-center">
                <View className="flex-1 pr-3">
                  <Text className="text-[15px] font-bold text-[#F2F2F4]">
                    {item.category}
                  </Text>
                  <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#303033]">
                    <View
                      className="h-full rounded-full bg-[#087BFF]"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </View>
                </View>
                <View className="w-[86px] items-end">
                  <Text className="text-[14px] font-extrabold text-[#F2F2F4]">
                    {item.amount}
                  </Text>
                  <Text className="mt-1 text-[12px] font-bold text-[#8E8E92]">
                    {item.percentage}%
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MessageBubble({
  message,
  onTextUpdate,
}: {
  message: ChatMessage;
  onTextUpdate: () => void;
}) {
  const isUser = message.role === "user";

  if (message.role === "loading") {
    return (
      <View className="mb-4 px-7">
        <Text className="text-[24px] font-bold tracking-[4px] text-[#77777B]">
          ...
        </Text>
      </View>
    );
  }

  if (!isUser) {
    return (
      <AssistantMessage
        breakdown={message.breakdown}
        onTextUpdate={onTextUpdate}
        text={message.text}
      />
    );
  }

  return (
    <View className="mb-4 flex-row justify-end">
      <View className="max-w-[84%] rounded-[22px] bg-[#087BFF] px-4 py-3">
        <Text className="text-[15px] font-medium leading-5 text-white">
          {message.text}
        </Text>
      </View>
    </View>
  );
}

export function AiScreen() {
  const insets = useSafeAreaInsets();
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickPrompts, setQuickPrompts] = useState<string[]>(QUICK_PROMPTS);
  const hasMessages = messages.length > 0;
  const canSend = inputValue.trim().length > 0;
  const composerBottomOffset = isKeyboardVisible
    ? 8
    : Math.max(insets.bottom, 14) + BOTTOM_TAB_OFFSET;

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardWillShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardWillHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(logoOpacity, {
      duration: isKeyboardVisible || hasMessages ? 360 : 420,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      toValue: isKeyboardVisible || hasMessages ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [hasMessages, isKeyboardVisible, logoOpacity]);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) {
        clearTimeout(replyTimeoutRef.current);
      }
    };
  }, []);

  function sendMessage(text: string) {
    const prompt = text.trim();

    if (!prompt) {
      return;
    }

    setQuickPrompts(CONTEXTUAL_QUICK_PROMPTS[getPromptTopic(prompt)]);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: prompt,
    };
    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: "loading",
      text: "...",
    };

    setMessages((currentMessages) => [...currentMessages, userMessage, loadingMessage]);
    setInputValue("");
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    if (replyTimeoutRef.current) {
      clearTimeout(replyTimeoutRef.current);
    }

    replyTimeoutRef.current = setTimeout(() => {
      const assistantReply = buildAssistantReply(prompt);
      const assistantMessage: ChatMessage = {
        breakdown: assistantReply.breakdown,
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: assistantReply.text,
      };

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === loadingMessage.id ? assistantMessage : message
        )
      );
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
    }, LOADING_REPLY_DELAY_MS);
  }

  const scrollToConversationEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-black"
      keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
    >
      <View
        className="flex-1"
        style={{ paddingTop: insets.top + 14 }}
      >
        <View className="mb-4 flex-row items-center justify-between px-5">
          <Text className="text-[28px] font-extrabold text-[#E8E8EC]">
            Geko AI
          </Text>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#1D1D1F]">
            <Sparkles color="#D8D8DC" size={21} strokeWidth={2.5} />
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerClassName={hasMessages ? "px-5 pt-2" : "flex-grow px-5"}
          contentContainerStyle={{
            paddingBottom: isKeyboardVisible ? 104 : 170,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {hasMessages ? (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onTextUpdate={scrollToConversationEnd}
              />
            ))
          ) : (
            <View className="flex-1 items-center justify-center pb-16">
              <Animated.View
                style={{
                  opacity: logoOpacity,
                  transform: [
                    {
                      scale: logoOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                    {
                      translateY: logoOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-6, 0],
                      }),
                    },
                  ],
                }}
              >
                <Image
                  source={require("@/src/assets/icons/geko-logo.png")}
                  className="h-[104px] w-[104px]"
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          )}
        </ScrollView>

        <View
          className="px-5"
          style={{ paddingBottom: composerBottomOffset }}
        >
          <ScrollView
            className="mb-3"
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            <View className="flex-row gap-2 pr-5">
              {quickPrompts.map((prompt) => (
                <Pressable
                  className="rounded-full border border-white/10 bg-[#141416] px-3.5 py-2.5"
                  key={prompt}
                  onPress={() => sendMessage(prompt)}
                >
                  <Text className="text-[12px] font-bold text-[#D8D8DC]">
                    {prompt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View className="min-h-[56px] flex-row items-end rounded-[26px] border border-white/10 bg-[#141416] px-3 py-2">
            <Pressable className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-[#242426]">
              <Plus color="#D8D8DC" size={21} strokeWidth={2.5} />
            </Pressable>
            <TextInput
              className="max-h-[120px] flex-1 py-2 text-[16px] font-medium text-white"
              multiline
              onChangeText={setInputValue}
              onSubmitEditing={() => sendMessage(inputValue)}
              placeholder="Message Geko"
              placeholderTextColor="#77777B"
              returnKeyType="send"
              value={inputValue}
            />
            <Pressable
              className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${
                canSend ? "bg-white" : "bg-[#2A2A2D]"
              }`}
              disabled={!canSend}
              onPress={() => sendMessage(inputValue)}
            >
              <ArrowUp
                color={canSend ? "#06101B" : "#77777B"}
                size={20}
                strokeWidth={3}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
