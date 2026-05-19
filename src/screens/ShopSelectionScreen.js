import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // <--- NEW IMPORT
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';

export default function ShopSelectionScreen() {
  const router = useRouter();

  const ShopItem = ({ name, icon }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      // We only pass the name. We will load the menu data in the next screen.
      onPress={() => router.push({ pathname: '/home', params: { shopName: name } })} 
    >
      <View style={styles.iconCircle}>
        <MaterialIcons name={icon} size={28} color={COLORS.brown} />
      </View>
      <Text style={styles.itemText}>{name}</Text>
      <MaterialIcons name="chevron-right" size={28} color={COLORS.brown} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.headerText}>Where are we grabbing coffee?</Text>
        <View style={styles.listContainer}>
          <ShopItem name="Starbucks" icon="star" />
          <View style={styles.divider} />
          <ShopItem name="Zus Coffee" icon="flash-on" />
          <View style={styles.divider} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  body: { paddingHorizontal: 20, paddingVertical: 10 },
  headerText: { fontSize: 24, fontWeight: 'bold', color: COLORS.brown, marginVertical: 20 },
  listContainer: { marginTop: 10 },
  itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 5 },
  iconCircle: { padding: 10, backgroundColor: 'rgba(240, 234, 226, 0.5)', borderRadius: 50, marginRight: 15 },
  itemText: { flex: 1, fontSize: 20, fontWeight: '600', color: COLORS.brown },
  divider: { height: 1, backgroundColor: COLORS.grey, width: '100%' },
});