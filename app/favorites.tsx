// app/favorites.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    FlatList,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useFavorites } from "../src/context/FavoritesContext";

const PREMIUM_COLORS = {
  background: "#FAF7F2",
  primary: "#4A3219",
  accent: "#C17A36",
  textDark: "#2C1E16",
  textLight: "#8C7A6B",
  white: "#FFFFFF",
};

export default function FavoritesScreen() {
  const { favorites, toggleFavorite } = useFavorites();

  const renderFavoriteItem = ({ item }: { item: any }) => {
    // Safety check just in case prices are missing
    const sizes = item.prices ? Object.keys(item.prices) : [];
    const startingPrice = sizes.length > 0 ? item.prices[sizes[0]] : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardCategory}>
            {item.shopName} • {item.category}
          </Text>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardPrice}>
            Starts at ₱{startingPrice.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => toggleFavorite(item, item.shopName)}
        >
          <Ionicons name="heart-dislike" size={24} color="#E63946" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          {/* FIXED: Changed to a valid Ionicons name */}
          <Ionicons
            name="heart-outline"
            size={80}
            color="#EFEAE2"
            style={{ marginBottom: 20 }}
          />
          <Text style={styles.emptyTitle}>No favorites yet!</Text>
          <Text style={styles.emptySubtitle}>
            Go browse the Starbucks or Zus menus and tap the heart icon to save
            your favorite drinks here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.name}
          renderItem={renderFavoriteItem}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: Platform.OS === "android" ? 40 : 20,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PREMIUM_COLORS.background },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: PREMIUM_COLORS.textDark,
  },
  emptySubtitle: {
    fontSize: 16,
    color: PREMIUM_COLORS.textLight,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },

  card: {
    backgroundColor: PREMIUM_COLORS.white,
    borderRadius: 20,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTextContainer: { flex: 1 },
  cardCategory: {
    fontSize: 11,
    fontWeight: "bold",
    color: PREMIUM_COLORS.accent,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PREMIUM_COLORS.textDark,
    marginBottom: 6,
  },
  cardPrice: { fontSize: 15, fontWeight: "800", color: PREMIUM_COLORS.primary },
  removeBtn: { padding: 12, backgroundColor: "#FFF0F0", borderRadius: 50 },
});
