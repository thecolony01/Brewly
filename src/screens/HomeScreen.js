// src/screens/HomeScreen.js
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
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
import { starbucksMenu, zusMenu } from "../data/coffeeData";

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

export default function HomeScreen() {
  const { shopName } = useLocalSearchParams();
  const menu = shopName === "Starbucks" ? starbucksMenu : zusMenu;

  // UI State
  const [chatVisible, setChatVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Chat State
  const [inputText, setInputText] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      content: `Hi! I'm your Brewly AI Barista. What kind of drink are you craving from ${shopName} today?`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef();

  // Filter Logic
  const filteredMenu =
    selectedCategory === "All"
      ? menu
      : menu.filter((item) => item.category === selectedCategory);

  const showHelpInfo = () => {
    Alert.alert(
      "Help & Support",
      "Browse the menu below, or tap the ✨ Ask AI Barista button for a personalized recommendation!",
      [{ text: "Got it", style: "default" }],
    );
  };

  const handleSendMessage = async (textOverride = null) => {
    const messageToSend = textOverride || inputText.trim();
    if (!messageToSend) return;

    if (!textOverride) setInputText("");
    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: messageToSend },
    ]);
    setIsLoading(true);

    try {
      const menuString = menu
        .map((item) => {
          const sizePrices = Object.entries(item.prices)
            .map(([size, price]) => `${size}: ₱${price.toFixed(2)}`)
            .join(", ");
          return `- ${item.name} (${item.category}): [${sizePrices}] - ${item.description}`;
        })
        .join("\n");

      const systemPrompt = `You are a helpful AI barista for Brewly. The user is at ${shopName}. Menu: \n${menuString}\nRecommend 1 or 2 specific drinks strictly from this menu. Be concise, friendly, and ALWAYS ask the user what size they want, providing the specific prices for those sizes.`;

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer YOUR_API_KEY`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://brewly.app",
            "X-Title": "Brewly App",
          },
          body: JSON.stringify({
            model: "qwen/qwen-2.5-72b-instruct",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: messageToSend },
            ],
            max_tokens: 250,
            temperature: 0.7,
          }),
        },
      );

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        const aiResponse = data.choices[0].message.content;
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: aiResponse },
        ]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, my systems are a bit overwhelmed right now. Try asking again!",
          },
        ]);
      }
    } catch (error) {
      console.error(error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error. Please check your connection.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMenuItem = ({ item }) => {
    const sizes = Object.keys(item.prices);
    const startingPrice = item.prices[sizes[0]];
    const hasMultipleSizes = sizes.length > 1;

    return (
      <View style={styles.card}>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardCategory}>{item.category}</Text>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.cardPrice}>
            {hasMultipleSizes ? "Starts at " : ""}₱{startingPrice.toFixed(2)}
          </Text>
          <Text style={styles.cardSizes}>Sizes: {sizes.join(", ")}</Text>
        </View>
        <View style={styles.cardIconContainer}>
          <FontAwesome5
            name={item.category === "Hot" ? "coffee" : "glass-whiskey"}
            size={32}
            color={PREMIUM_COLORS.accent}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: shopName,
          headerStyle: { backgroundColor: PREMIUM_COLORS.background },
          headerTintColor: PREMIUM_COLORS.primary,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={showHelpInfo}
              style={{ marginRight: 15, padding: 5 }}
            >
              <Ionicons
                name="information-circle-outline"
                size={28}
                color={PREMIUM_COLORS.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.headerBanner}>
        <Text style={styles.headerSubtitle}>Discover your perfect cup</Text>
        <Text style={styles.headerTitle}>Menu</Text>
      </View>

      {/* --- NEW: CATEGORY FILTER PILLS --- */}
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
                  <Text style={styles.sheetSubtitle}>Always here to help</Text>
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
              {chatHistory.map((msg, index) => (
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

            {/* --- NEW: QUICK REPLIES --- */}
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

  // New Filter Styles
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
    width: 80,
    height: 80,
    backgroundColor: PREMIUM_COLORS.background,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  fab: {
    position: "absolute",
    bottom: 30,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: PREMIUM_COLORS.white },
  aiText: { color: PREMIUM_COLORS.textDark },

  // New Quick Replies Styles
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
