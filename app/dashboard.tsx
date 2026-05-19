// app/dashboard.tsx
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
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

import { signOut } from "firebase/auth";
import { auth } from "../src/config/firebase";
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
  "I need caffeine for an all-nighter 💻",
  "What's the cheapest iced coffee? 🧊",
  "Recommend a sweet frappe ✨",
];

export default function UniversalHomeScreen() {
  const router = useRouter();

  const {
    userStats,
    awardAchievement,
    logDrink,
    removeDrink,
    globalChatHistory,
    updateChatHistory,
  } = useFavorites();

  const [chatVisible, setChatVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 18) return "Good afternoon!";
    return "Good evening!";
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  const handleSendMessage = async (textOverride: string | null = null) => {
    const messageToSend = textOverride || inputText.trim();
    if (!messageToSend) return;

    if (!textOverride) setInputText("");
    setIsLoading(true);

    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 4) awardAchievement("Night Owl 🦉");

    const historyWithUser = [
      ...globalChatHistory,
      { role: "user", content: messageToSend, suggestedLog: null },
    ];
    await updateChatHistory(historyWithUser);

    try {
      const formatMenu = (menuArray: any[], shopName: string) => {
        if (!menuArray || menuArray.length === 0) return `[No menu]`;
        return menuArray
          .map((item) => {
            const sizePrices = Object.entries(item.prices || {})
              .map(([size, price]) => `${size}: ₱${Number(price).toFixed(2)}`)
              .join(", ");
            return `- [${shopName}] ${item.name} (${item.category}): [${sizePrices}]`;
          })
          .join("\n");
      };

      const shuffledShops = [...coffeeShops].sort(() => Math.random() - 0.5);
      const fullMenuString = shuffledShops
        .map((shop) => {
          const shuffledItems = [...shop.menu].sort(() => Math.random() - 0.5);
          return `--- ${shop.name.toUpperCase()} --- \n${formatMenu(shuffledItems, shop.name)}`;
        })
        .join("\n\n");

      const systemPrompt = `You are the global AI barista for the Brewly app at LPU Cavite.

<menu_data>
${fullMenuString}
</menu_data>

<user_context>
Estimated caffeine intake today: ${userStats?.caffeineToday || 0}mg. (Warn them strictly if they are over 300mg).
</user_context>

<instructions>
1. Carefully read the message inside the <current_user_request> tag.
2. Formulate a highly dynamic recommendation unique to their request. 
3. CRITICAL: To ensure variety, you must mentally roll a 20-sided die. Pick a drink from the <menu_data> that corresponds to that random roll. Never suggest the most obvious choice.
4. INTERACTIVE LOGGING: If you recommend a drink, append this secret tag at the absolute end of your response: [SUGGEST_LOG: Drink Name | CaffeineAmount]. 
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
            "X-Title": "Brewly Bot",
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
            content: "I couldn't process that. Try asking again!",
          },
        ]);
      }
    } catch (error: any) {
      console.log("Chatbot Fetch Error:", error.message);
      let errorMessage = "Oops! I hit a snag.";
      if (error.message.includes("429")) {
        errorMessage =
          "Whoa, I'm getting too many orders at once! Give me about 60 seconds to catch up, then try asking again. ☕";
      } else if (error.message.includes("400")) {
        errorMessage =
          "I got a bad request. Check the VS Code terminal for the exact error log!";
      } else if (error.message.includes("empty response")) {
        errorMessage =
          "The AI barista is taking a quick break. Try asking that one more time!";
      }
      await updateChatHistory([
        ...historyWithUser,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/coffeebg.jpg")}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar
        style="light"
        translucent={true}
        backgroundColor="transparent"
      />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeContent}>
        <View style={styles.heroSection}>
          <View style={styles.headerTopRow}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroGreeting}>{getGreeting()}</Text>
              <Text style={styles.heroTitle}>
                Let's find your perfect brew.
              </Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <MaterialIcons
                name="logout"
                size={24}
                color={PREMIUM_COLORS.white}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.statsPanel}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Caffeine Today</Text>
              <View style={styles.caffeineRow}>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        (userStats?.caffeineToday || 0) > 300
                          ? "#E63946"
                          : PREMIUM_COLORS.white,
                    },
                  ]}
                >
                  ☕ {userStats?.caffeineToday || 0}mg{" "}
                  <Text style={styles.statLimit}>/ 400mg</Text>
                </Text>
                {userStats?.loggedDrinksToday?.length > 0 && (
                  <TouchableOpacity
                    style={styles.undoBtn}
                    onPress={() => setHistoryModalVisible(true)}
                  >
                    <Ionicons
                      name="list"
                      size={16}
                      color={PREMIUM_COLORS.white}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Badges Unlocked</Text>
              {userStats?.achievements && userStats.achievements.length > 0 ? (
                <Text style={styles.statValue}>
                  {userStats.achievements.join(" ")}
                </Text>
              ) : (
                <Text style={styles.statLimit}>No badges yet</Text>
              )}
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.browseSection}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Browse by shop</Text>

          {coffeeShops.map((shop) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.shopCard}
              onPress={() =>
                router.push({
                  pathname: "/home",
                  params: { shopName: shop.name },
                })
              }
            >
              <View style={styles.shopIconContainer}>
                <FontAwesome5
                  name={shop.icon as any}
                  size={24}
                  color={PREMIUM_COLORS.primary}
                />
              </View>
              <View style={styles.shopCardText}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopDesc}>{shop.description}</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={28}
                color={PREMIUM_COLORS.textLight}
              />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[
              styles.shopCard,
              { backgroundColor: PREMIUM_COLORS.primary, marginTop: -5 },
            ]}
            onPress={() => router.push({ pathname: "/favorites" as any })}
          >
            <View
              style={[
                styles.shopIconContainer,
                { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              <Ionicons name="heart" size={24} color={PREMIUM_COLORS.white} />
            </View>
            <View style={styles.shopCardText}>
              <Text style={[styles.shopName, { color: PREMIUM_COLORS.white }]}>
                My Favorites
              </Text>
              <Text
                style={[styles.shopDesc, { color: "rgba(255,255,255,0.8)" }]}
              >
                Your saved drinks
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={28}
              color={PREMIUM_COLORS.white}
            />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

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
        visible={historyModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModalBox}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>Today's Log</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={PREMIUM_COLORS.textDark}
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
            >
              {userStats?.loggedDrinksToday?.map((drink: any) => (
                <View key={drink.id} style={styles.historyItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyItemName}>{drink.name}</Text>
                    <Text style={styles.historyItemCaf}>
                      {drink.caffeine}mg
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeDrink(drink.id)}
                    style={styles.historyTrashBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color="#E63946" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(44, 30, 22, 0.65)",
  },
  safeContent: { flex: 1, paddingTop: Platform.OS === "android" ? 40 : 0 },
  heroSection: { paddingHorizontal: 25, paddingTop: 40, marginBottom: 20 },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroTextContainer: { flex: 1, paddingRight: 15 },
  heroGreeting: {
    color: "#E8E0D5",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    color: PREMIUM_COLORS.white,
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 50,
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 50,
    marginLeft: 10,
  },
  statsPanel: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 15,
    padding: 15,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statBox: { flex: 1 },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 15,
  },
  statLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  caffeineRow: { flexDirection: "row", alignItems: "center" },
  undoBtn: {
    marginLeft: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 4,
    borderRadius: 10,
  },
  statValue: { color: PREMIUM_COLORS.white, fontSize: 18, fontWeight: "bold" },
  statLimit: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "normal",
  },
  browseSection: { paddingHorizontal: 20, paddingBottom: 120 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E8E0D5",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  shopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PREMIUM_COLORS.white,
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  shopIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: PREMIUM_COLORS.background,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  shopCardText: { flex: 1 },
  shopName: {
    fontSize: 18,
    fontWeight: "bold",
    color: PREMIUM_COLORS.textDark,
    marginBottom: 4,
  },
  shopDesc: { fontSize: 13, color: PREMIUM_COLORS.textLight },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "android" ? 40 : 30,
    alignSelf: "center",
    backgroundColor: PREMIUM_COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: PREMIUM_COLORS.white,
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
  historyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  historyModalBox: {
    width: "100%",
    backgroundColor: PREMIUM_COLORS.background,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  historyModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  historyModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: PREMIUM_COLORS.textDark,
  },
  historyItem: {
    flexDirection: "row",
    backgroundColor: PREMIUM_COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  historyItemName: {
    fontSize: 15,
    fontWeight: "700",
    color: PREMIUM_COLORS.textDark,
  },
  historyItemCaf: {
    fontSize: 12,
    color: PREMIUM_COLORS.textLight,
    marginTop: 2,
  },
  historyTrashBtn: { padding: 8, backgroundColor: "#FFF0F0", borderRadius: 50 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
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
