import { useRouter } from 'expo-router'; // <--- NEW IMPORT
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';

const bgImage = require('../../assets/coffeebg.jpg'); 

export default function SplashScreen() {
  const router = useRouter(); // <--- NEW HOOK

  return (
    <ImageBackground source={bgImage} style={styles.background} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Brewly</Text>
        <Text style={styles.subtitle}>Find your perfect cup.</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.replace('/shop-selection')} // <--- UPDATED
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { color: COLORS.white, fontSize: 52, fontWeight: 'bold', letterSpacing: 2, marginBottom: 20 },
  subtitle: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 18, marginBottom: 70 },
  button: { backgroundColor: COLORS.brown, paddingVertical: 16, paddingHorizontal: 50, borderRadius: 30, elevation: 5 },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});