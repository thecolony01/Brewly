// src/context/FavoritesContext.tsx
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";

const FavoritesContext = createContext<any>(null);

export const FavoritesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userStats, setUserStats] = useState({
    caffeineToday: 0,
    achievements: [] as string[],
    loggedDrinksToday: [] as any[],
  });

  // --- NEW: Global Chat History State ---
  const [globalChatHistory, setGlobalChatHistory] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setFavorites([]);
        setUserStats({
          caffeineToday: 0,
          achievements: [],
          loggedDrinksToday: [],
        });
        setGlobalChatHistory([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userFavoritesRef = collection(db, "users", user.uid, "favorites");
    const unsubscribeFavs = onSnapshot(userFavoritesRef, (snapshot) => {
      const fetchedFavorites = snapshot.docs.map((doc) => doc.data());
      setFavorites(fetchedFavorites);
    });

    const profileRef = doc(db, "users", user.uid, "data", "profile");
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const today = new Date().toDateString();

        if (data.lastLoginDate !== today) {
          updateDoc(profileRef, {
            caffeineToday: 0,
            loggedDrinksToday: [],
            lastLoginDate: today,
          });
          setUserStats({
            caffeineToday: 0,
            achievements: data.achievements || [],
            loggedDrinksToday: [],
          });
        } else {
          setUserStats({
            caffeineToday: data.caffeineToday || 0,
            achievements: data.achievements || [],
            loggedDrinksToday: data.loggedDrinksToday || [],
          });
        }

        // --- NEW: Fetch Chat History from Firebase ---
        const fetchedChat = data.chatHistory || [];
        if (fetchedChat.length === 0) {
          // Default greeting for brand new users
          setGlobalChatHistory([
            {
              role: "assistant",
              content: `Hi! I'm your Brewly AI Barista. I know all the shops on campus! Want me to recommend something?`,
              suggestedLog: null,
            },
          ]);
        } else {
          setGlobalChatHistory(fetchedChat);
        }
      } else {
        setDoc(profileRef, {
          caffeineToday: 0,
          achievements: [],
          loggedDrinksToday: [],
          chatHistory: [],
          lastLoginDate: new Date().toDateString(),
        });
      }
    });

    return () => {
      unsubscribeFavs();
      unsubscribeProfile();
    };
  }, [user]);

  // --- NEW: Function to save chat history directly to the user's Firebase ---
  const updateChatHistory = async (newHistory: any[]) => {
    if (!user) return;
    const profileRef = doc(db, "users", user.uid, "data", "profile");
    // Save only the last 30 messages to save database space
    const trimmedHistory = newHistory.slice(-30);
    await updateDoc(profileRef, { chatHistory: trimmedHistory });
  };

  const awardAchievement = async (badgeName: string) => {
    if (!user || userStats.achievements.includes(badgeName)) return;
    const profileRef = doc(db, "users", user.uid, "data", "profile");
    const newAchievements = [...userStats.achievements, badgeName];
    await updateDoc(profileRef, { achievements: newAchievements });
    alert(`🏆 Achievement Unlocked: ${badgeName}!`);
  };

  const logDrink = async (caffeineAmount: number, drinkName: string) => {
    if (!user) return;
    const profileRef = doc(db, "users", user.uid, "data", "profile");
    const newDrinkEntry = {
      id: Date.now().toString(),
      name: drinkName,
      caffeine: caffeineAmount,
    };
    const updatedLog = [...(userStats.loggedDrinksToday || []), newDrinkEntry];
    await updateDoc(profileRef, {
      caffeineToday: userStats.caffeineToday + caffeineAmount,
      loggedDrinksToday: updatedLog,
    });
  };

  const removeDrink = async (drinkId: string) => {
    if (!user) return;
    const drinkToRemove = userStats.loggedDrinksToday.find(
      (d: any) => d.id === drinkId,
    );
    if (!drinkToRemove) return;
    const profileRef = doc(db, "users", user.uid, "data", "profile");
    const updatedLog = userStats.loggedDrinksToday.filter(
      (d: any) => d.id !== drinkId,
    );
    const newAmount = Math.max(
      0,
      userStats.caffeineToday - drinkToRemove.caffeine,
    );
    await updateDoc(profileRef, {
      caffeineToday: newAmount,
      loggedDrinksToday: updatedLog,
    });
  };

  const toggleFavorite = async (item: any, shopName: string) => {
    if (!user) return alert("Please log in to save favorites!");
    const drinkId = item.name.replace(/\s+/g, "-").toLowerCase();
    const docRef = doc(db, "users", user.uid, "favorites", drinkId);
    const isExist = favorites.find((fav: any) => fav.name === item.name);
    try {
      if (isExist) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { ...item, shopName });
        const newFavorites = [...favorites, { ...item, shopName }];
        const zusCount = newFavorites.filter(
          (f) => f.shopName === "Zus Coffee",
        ).length;
        if (zusCount >= 5) awardAchievement("Brand Loyalist ⚡");
        const categories = new Set(newFavorites.map((f) => f.category));
        if (
          categories.has("Hot") &&
          categories.has("Iced") &&
          categories.has("Frappe")
        ) {
          awardAchievement("The Explorer 🗺️");
        }
      }
    } catch (error) {
      console.error("Error updating favorite:", error);
    }
  };

  const isFavorite = (itemName: string) =>
    favorites.some((fav: any) => fav.name === itemName);

  return (
    // Make sure to export the new states and functions!
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        userStats,
        awardAchievement,
        logDrink,
        removeDrink,
        globalChatHistory,
        updateChatHistory,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
