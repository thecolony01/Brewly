// app/index.tsx
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Import Firebase Auth functions
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../src/config/firebase";

const PREMIUM_COLORS = {
  background: "#FAF7F2",
  primary: "#4A3219",
  accent: "#C17A36",
  textDark: "#2C1E16",
  textLight: "#8C7A6B",
  white: "#FFFFFF",
};

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true); // Toggle between Login and Signup
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      if (isLoginMode) {
        // FIREBASE SIGN IN
        await signInWithEmailAndPassword(auth, email, password);
        router.replace("/dashboard");
      } else {
        // FIREBASE CREATE ACCOUNT
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert("Success!", "Account created successfully.");
        router.replace("/dashboard");
      }
    } catch (error: any) {
      // Make Firebase errors look pretty for the user
      let errorMessage = "An error occurred. Please try again.";
      if (error.code === "auth/invalid-email")
        errorMessage = "That email address is invalid.";
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      )
        errorMessage = "Incorrect email or password.";
      if (error.code === "auth/email-already-in-use")
        errorMessage = "An account already exists with that email.";
      if (error.code === "auth/weak-password")
        errorMessage = "Password must be at least 6 characters.";

      Alert.alert("Authentication Failed", errorMessage);
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
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* App Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <FontAwesome5
              name="coffee"
              size={40}
              color={PREMIUM_COLORS.primary}
            />
          </View>
          <Text style={styles.title}>Brewly</Text>
          <Text style={styles.subtitle}>Your AI Barista awaits.</Text>
        </View>

        {/* Authentication Card */}
        <View style={styles.loginCard}>
          <Text style={styles.cardHeader}>
            {isLoginMode ? "Welcome Back" : "Create Account"}
          </Text>

          <View style={styles.inputContainer}>
            <MaterialIcons
              name="email"
              size={20}
              color={PREMIUM_COLORS.textLight}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Email address"
              placeholderTextColor={PREMIUM_COLORS.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons
              name="lock"
              size={20}
              color={PREMIUM_COLORS.textLight}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor={PREMIUM_COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={PREMIUM_COLORS.white} />
            ) : (
              <>
                <Text style={styles.loginButtonText}>
                  {isLoginMode ? "Sign In" : "Sign Up"}
                </Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={20}
                  color={PREMIUM_COLORS.white}
                />
              </>
            )}
          </TouchableOpacity>

          {/* Toggle between Login and Sign Up */}
          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => setIsLoginMode(!isLoginMode)}
          >
            <Text style={styles.toggleText}>
              {isLoginMode
                ? "Don't have an account? "
                : "Already have an account? "}
              <Text style={styles.toggleTextBold}>
                {isLoginMode ? "Sign Up" : "Sign In"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(44, 30, 22, 0.75)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },

  brandContainer: { alignItems: "center", marginBottom: 50 },
  logoCircle: {
    width: 90,
    height: 90,
    backgroundColor: PREMIUM_COLORS.background,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    color: PREMIUM_COLORS.white,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 2,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    marginTop: 5,
    fontStyle: "italic",
  },

  loginCard: {
    backgroundColor: PREMIUM_COLORS.white,
    width: "100%",
    borderRadius: 25,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  cardHeader: {
    fontSize: 24,
    fontWeight: "700",
    color: PREMIUM_COLORS.textDark,
    marginBottom: 25,
    textAlign: "center",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EAE2",
    borderRadius: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 16, color: PREMIUM_COLORS.textDark },

  loginButton: {
    backgroundColor: PREMIUM_COLORS.accent,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 55,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: PREMIUM_COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  loginButtonText: {
    color: PREMIUM_COLORS.white,
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },

  toggleContainer: { marginTop: 25, alignItems: "center" },
  toggleText: { color: PREMIUM_COLORS.textLight, fontSize: 14 },
  toggleTextBold: { color: PREMIUM_COLORS.primary, fontWeight: "bold" },
});
