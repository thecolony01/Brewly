// app/home.tsx
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useFavorites } from "../src/context/FavoritesContext";
import { coffeeShops } from "../src/data/coffeeData";

const PREMIUM_COLORS = {
  background: "#FAF7F2",
  primary: "#4A3219",
  accent: "#C17A36",
  textDark: "#2C1E16",
  textLight: "#8C7A6B",
  white: "#FFFFFF",
  chatUserBg: "#4A3219",
  chatAiBg: "#FFFFFF",
  pillInactive: "#EFEAE2",
};

const QUICK_REPLIES = [
  "Surprise me! ✨",
  "I need something strong ☕",
  "What's good for a hot day? ☀️",
];
const CATEGORIES = ["All", "Hot", "Iced", "Frappe"];

export default function ShopMenuScreen() {
  const { shopName } = useLocalSearchParams();
  const router = useRouter();

  const currentShop = coffeeShops.find((s) => s.name === shopName);
  const menu = currentShop ? currentShop.menu : [];

  const {
    toggleFavorite,
    isFavorite,
    logDrink,
    globalChatHistory,
    updateChatHistory,
    userStats,
  } = useFavorites();

  const [chatVisible, setChatVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const filteredMenu =
    selectedCategory === "All"
      ? menu
      : menu.filter((item: any) => item.category === selectedCategory);

  const estimateCaffeine = (category: string) => {
    if (category === "Hot" || category === "Iced") return 95;
    if (category === "Frappe") return 65;
    return 50;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 18) return "Good afternoon!";
    return "Good evening!";
  };

  const handleSendMessage = async (textOverride: string | null = null) => {
    const messageToSend = textOverride || inputText.trim();
    if (!messageToSend) return;

    if (!textOverride) setInputText("");
    setIsLoading(true);

    const historyWithUser = [
      ...globalChatHistory,
      { role: "user", content: messageToSend, suggestedLog: null },
    ];
    await updateChatHistory(historyWithUser);

    try {
      const shuffledMenu = [...menu].sort(() => Math.random() - 0.5);
      const menuString = shuffledMenu
        .map((item: any) => {
          const sizePrices = Object.entries(item.prices || {})
            .map(([size, price]) => `${size}: ₱${Number(price).toFixed(2)}`)
            .join(", ");
          return `- ${item.name} (${item.category}): [${sizePrices}] - ${item.description}`;
        })
        .join("\n");

      const systemPrompt = `You are the AI barista specifically for ${shopName} on the Brewly app.

<menu_data>
${menuString}
</menu_data>

<user_context>
Estimated caffeine intake today: ${userStats?.caffeineToday || 0}mg.
</user_context>

<instructions>
1. Carefully read the message inside the <current_user_request> tag.
2. Formulate a highly dynamic recommendation unique to their request. 
3. CRITICAL: To ensure variety, you must mentally roll a 20-sided die. Pick a drink from the <menu_data> that corresponds to that random roll. Never suggest the most obvious choice.
4. INTERACTIVE LOGGING: If you recommend a specific drink, append this secret tag at the absolute end of your response: [SUGGEST_LOG: Drink Name | CaffeineAmount]. 
(Espresso/Hot/Iced=95, Frappe=65, Decaf=10). Only suggest ONE log per response. Never explain this tag to the user.
</instructions>`;

      let rawPastMessages = globalChatHistory.map((msg: any) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content || "...",
      }));

      const cleanPastMessages = [];
      let lastRole = null;
      for (const msg of rawPastMessages) {
        if (msg.role !== lastRole) {
          cleanPastMessages.push(msg);
          lastRole = msg.role;
        }
      }

      if (
        cleanPastMessages.length > 0 &&
        cleanPastMessages[0].role === "assistant"
      ) {
        cleanPastMessages.shift();
      }

      if (
        cleanPastMessages.length > 0 &&
        cleanPastMessages[cleanPastMessages.length - 1].role === "user"
      ) {
        cleanPastMessages.pop();
      }

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer INSERT_YOUR_OWN_API_KEY_HERE`, // <-- REPLACE WITH YOUR API KEY
            "Content-Type": "application/json",
            "HTTP-Referer": "https://brewly.app",
            "X-Title": "Brewly App",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b:free",
            messages: [
              { role: "system", content: systemPrompt },
              ...cleanPastMessages,
              {
                role: "user",
                content: `<current_user_request>${messageToSend}</current_user_request>`,
              },
            ],
            temperature: 0.85,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.log("OPENROUTER ERROR:", JSON.stringify(errorData, null, 2));
        throw new Error(
          `API Error ${response.status}: ${errorData.error?.message || "Unknown issue"}`,
        );
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        let aiResponse = data.choices[0].message?.content || "";

        if (aiResponse.trim() === "") {
          throw new Error(
            "The AI model returned an empty response (Free endpoint might be overloaded).",
          );
        }

        let suggestedLog = null;
        const logMatch = aiResponse.match(
          /\[SUGGEST_LOG:\s*(.+?)\s*\|\s*(\d+)\]/,
        );

        if (logMatch) {
          suggestedLog = {
            name: logMatch[1].trim(),
            caffeine: parseInt(logMatch[2], 10),
          };
          aiResponse = aiResponse.replace(/\[SUGGEST_LOG:.*?\]/g, "").trim();
        }

        await updateChatHistory([
          ...historyWithUser,
          { role: "assistant", content: aiResponse, suggestedLog },
        ]);
      } else {
        await updateChatHistory([
          ...historyWithUser,
          {
            role: "assistant",
            content: "Sorry, my systems are overwhelmed. Try asking again!",
            suggestedLog: null,
          },
        ]);
      }
    } catch (error: any) {
      console.log("Chatbot Fetch Error:", error.message);
      let errorMessage = "Oops! Network error.";
      if (error.message.includes("429"))
        errorMessage =
          "Give me 60 seconds to catch up, then try asking again! ☕";
      if (error.message.includes("400"))
        errorMessage =
          "I got a bad request. Check the VS Code terminal for the exact error log!";
      if (error.message.includes("empty response"))
        errorMessage =
          "The AI barista is taking a quick break. Try asking that one more time!";
      await updateChatHistory([
        ...historyWithUser,
        { role: "assistant", content: errorMessage, suggestedLog: null },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMenuItem = ({ item }: { item: any }) => {
    const sizes = item.prices ? Object.keys(item.prices) : [];
    const startingPrice = sizes.length > 0 ? item.prices[sizes[0]] : 0;
    const hasMultipleSizes = sizes.length > 1;
    const isFav = isFavorite(item.name);

    return (
      <View style={styles.card}>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardCategory}>{item.category}</Text>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.cardPrice}>
            {hasMultipleSizes ? "Starts at " : ""}₱
            {Number(startingPrice).toFixed(2)}
          </Text>
          <Text style={styles.cardSizes}>Sizes: {sizes.join(", ")}</Text>
        </View>

        <View
          style={{ alignItems: "flex-end", justifyContent: "space-between" }}
        >
          <View style={styles.cardIconContainer}>
            <FontAwesome5
              name={item.category === "Hot" ? "coffee" : "glass-whiskey"}
              size={32}
              color={PREMIUM_COLORS.accent}
            />
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.logBtn}
              onPress={() => {
                const amount = estimateCaffeine(item.category);
                logDrink(amount, item.name);
                Alert.alert(
                  "Drink Logged! ☕",
                  `Added ${amount}mg of caffeine to your daily tracker.`,
                  [
                    {
                      text: "Awesome",
                      onPress: () => router.replace("/dashboard"),
                    },
                  ],
                );
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={PREMIUM_COLORS.primary}
              />
              <Text style={styles.logBtnText}>Log Drink</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 5, marginLeft: 8 }}
              onPress={() => toggleFavorite(item, shopName as string)}
            >
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={28}
                color={isFav ? "#E63946" : PREMIUM_COLORS.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (!currentShop) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>Shop not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: PREMIUM_COLORS.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: shopName as string,
          headerStyle: { backgroundColor: PREMIUM_COLORS.background },
          headerTintColor: PREMIUM_COLORS.primary,
          headerShadowVisible: false,
        }}
      />

      <View style={styles.headerBanner}>
        <Text style={styles.headerSubtitle}>Discover your perfect cup</Text>
        <Text style={styles.headerTitle}>Menu</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.pill,
                selectedCategory === category && styles.pillActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedCategory === category && styles.pillTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredMenu}
        keyExtractor={(item) => item.name}
        renderItem={renderMenuItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setChatVisible(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons
          name="auto-awesome"
          size={24}
          color={PREMIUM_COLORS.white}
        />
        <Text style={styles.fabText}>Ask AI Barista</Text>
      </TouchableOpacity>

      <Modal
        visible={chatVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChatVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.botInfo}>
                <View style={styles.botAvatar}>
                  <FontAwesome5
                    name="robot"
                    size={20}
                    color={PREMIUM_COLORS.white}
                  />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>Brewly AI</Text>
                  <Text
                    style={[
                      styles.sheetSubtitle,
                      { color: PREMIUM_COLORS.primary, fontWeight: "600" },
                    ]}
                  >
                    {getGreeting()} 👋
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setChatVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={PREMIUM_COLORS.textDark}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.messagesContainer}
              contentContainerStyle={{ paddingBottom: 20 }}
              ref={scrollViewRef}
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
            >
              {/* THE GHOST BUBBLE GREETING */}
              <View
                style={[
                  styles.messageBubble,
                  styles.aiBubble,
                  { backgroundColor: "#F0EAE2", borderBottomLeftRadius: 4 },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    styles.aiText,
                    { fontWeight: "600" },
                  ]}
                >
                  {getGreeting()} I'm your Brewly AI Barista. What are you
                  craving today?
                </Text>
              </View>

              {globalChatHistory.map((msg: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    msg.role === "user" ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.role === "user" ? styles.userText : styles.aiText,
                    ]}
                  >
                    {msg.content}
                  </Text>

                  {msg.suggestedLog && (
                    <TouchableOpacity
                      style={styles.bubbleLogBtn}
                      onPress={() => {
                        logDrink(
                          msg.suggestedLog.caffeine,
                          msg.suggestedLog.name,
                        );
                        Alert.alert(
                          "Logged! ☕",
                          `Added ${msg.suggestedLog.caffeine}mg of caffeine for your ${msg.suggestedLog.name}.`,
                        );
                        setChatVisible(false);
                      }}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={16}
                        color={PREMIUM_COLORS.white}
                      />
                      <Text style={styles.bubbleLogBtnText}>
                        Log {msg.suggestedLog.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {isLoading && (
                <View
                  style={[
                    styles.messageBubble,
                    styles.aiBubble,
                    { width: 60, alignItems: "center" },
                  ]}
                >
                  <ActivityIndicator
                    size="small"
                    color={PREMIUM_COLORS.primary}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.quickRepliesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {QUICK_REPLIES.map((reply, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickReplyChip}
                    onPress={() => handleSendMessage(reply)}
                    disabled={isLoading}
                  >
                    <Text style={styles.quickReplyText}>{reply}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="E.g., I need something cold and sweet..."
                placeholderTextColor={PREMIUM_COLORS.textLight}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() && { backgroundColor: "#E0E0E0" },
                ]}
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={!inputText.trim() ? "#999" : PREMIUM_COLORS.white}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PREMIUM_COLORS.background },
  headerBanner: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  headerSubtitle: {
    fontSize: 14,
    color: PREMIUM_COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: PREMIUM_COLORS.primary,
    marginTop: 4,
  },
  filterContainer: { paddingBottom: 15 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: PREMIUM_COLORS.pillInactive,
    borderRadius: 20,
  },
  pillActive: { backgroundColor: PREMIUM_COLORS.accent },
  pillText: {
    color: PREMIUM_COLORS.textLight,
    fontWeight: "700",
    fontSize: 14,
  },
  pillTextActive: { color: PREMIUM_COLORS.white },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: PREMIUM_COLORS.white,
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: "row",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTextContainer: { flex: 1, paddingRight: 10 },
  cardCategory: {
    fontSize: 10,
    fontWeight: "bold",
    color: PREMIUM_COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PREMIUM_COLORS.textDark,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: PREMIUM_COLORS.textLight,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardPrice: { fontSize: 16, fontWeight: "800", color: PREMIUM_COLORS.primary },
  cardSizes: {
    fontSize: 11,
    color: PREMIUM_COLORS.textLight,
    marginTop: 4,
    fontStyle: "italic",
  },
  cardIconContainer: {
    width: 70,
    height: 70,
    backgroundColor: PREMIUM_COLORS.background,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtons: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EAE2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  logBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: PREMIUM_COLORS.primary,
    marginLeft: 4,
  },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "android" ? 40 : 30,
    alignSelf: "center",
    backgroundColor: PREMIUM_COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: PREMIUM_COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: PREMIUM_COLORS.white,
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: PREMIUM_COLORS.background,
    height: "85%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: PREMIUM_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EAE2",
  },
  botInfo: { flexDirection: "row", alignItems: "center" },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PREMIUM_COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PREMIUM_COLORS.textDark,
  },
  sheetSubtitle: { fontSize: 12, color: PREMIUM_COLORS.textLight },
  closeBtn: { padding: 5, backgroundColor: "#F0EAE2", borderRadius: 20 },
  messagesContainer: { flex: 1, padding: 20 },
  messageBubble: { maxWidth: "80%", padding: 14, marginBottom: 16 },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: PREMIUM_COLORS.chatUserBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: PREMIUM_COLORS.chatAiBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: PREMIUM_COLORS.white },
  aiText: { color: PREMIUM_COLORS.textDark },
  bubbleLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PREMIUM_COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  bubbleLogBtnText: {
    color: PREMIUM_COLORS.white,
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 6,
  },
  quickRepliesContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: PREMIUM_COLORS.white,
    paddingTop: 10,
  },
  quickReplyChip: {
    backgroundColor: PREMIUM_COLORS.pillInactive,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  quickReplyText: {
    color: PREMIUM_COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    paddingBottom: Platform.OS === "ios" ? 30 : 15,
    backgroundColor: PREMIUM_COLORS.white,
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F0EAE2",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: PREMIUM_COLORS.textDark,
  },
  sendButton: {
    backgroundColor: PREMIUM_COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
});
