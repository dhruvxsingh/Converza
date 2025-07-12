import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import Api from '../services/api';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ChatList'>;

interface UserLite {
  id: number;
  username: string;
}

export default function ChatListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [users, setUsers] = useState<UserLite[]>([]);

  /* ───────────────── fetch users once ───────────────── */
  useEffect(() => {
    (async () => {
      try {
        const token = await Api.getToken();
        const res = await fetch(`${Api.baseREST}/api/users/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: UserLite[] = await res.json();
        setUsers(data);
      } catch (err) {
        console.warn('Failed to fetch users', err);
      }
    })();
  }, []);

  /* ───────────────── row renderer ───────────────── */
  const renderChat = ({ item }: { item: UserLite }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() =>
        navigation.navigate('Chat', {
          userId: String(item.id),      // ChatScreen expects string
          userName: item.username,
        })
      }
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.username[0]?.toUpperCase()}
        </Text>
      </View>

      <View style={styles.chatInfo}>
        <Text style={styles.name}>{item.username}</Text>
        <Text style={styles.lastMessage}>Tap to chat</Text>
      </View>
    </TouchableOpacity>
  );

  /* ───────────────── render list ───────────────── */
  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        renderItem={renderChat}
        keyExtractor={(u) => u.id.toString()}
      />
    </View>
  );
}

/* ───────────────── styles ───────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastMessage: {
    color: '#666',
    marginTop: 2,
  },
});