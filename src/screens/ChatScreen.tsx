import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

import Api from '../services/api';
import useChatSocket, { ChatMessage } from '../hooks/useChatSocket';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  /* Route params ---------------------------------------------------------- */
  const { userName, userId } = route.params;        // userId is string
  const partnerId = Number(userId);                 // <- convert once

  /* Local state ----------------------------------------------------------- */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const flatListRef = useRef<FlatList<any>>(null);
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);
  /* Load history ---------------------------------------------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await Api.getToken();
      const res = await fetch(
        `${Api.baseREST}/api/chat/messages/${partnerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (alive) {
        const filtered = data.filter((m: any) => !('type' in m));
        setMessages(filtered);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId]);

  /* Live socket ----------------------------------------------------------- */
  const { send } = useChatSocket(partnerId, (msg) =>{
    if (!('type' in msg)) {
      setMessages(prev => [...prev, msg]);
    }
  });

  /* Send handler ---------------------------------------------------------- */
  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    send(text);
    setInput('');
  };

  /* Render ---------------------------------------------------------------- */
  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.bubble,
        item.sender_id === partnerId ? styles.left : styles.right,
      ]}
    >
      <Text style={styles.bubbleText}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Chat with {userName}</Text>
        <TouchableOpacity
          style={styles.videoButton}
          onPress={() => navigation.navigate('VideoCall', { partnerId: userId })}
        >
          <Text style={styles.videoButtonText}>📹</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id.toString()}
        renderItem={renderItem}

        /* 👇 ADD/CHANGE these two props */
        style={[{ flex: 1 }, Platform.OS === 'web' && { overflowY: 'auto' } as any]}
        contentContainerStyle={{ padding: 10, flexGrow: 1 }}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
          style={styles.input}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={{ color: 'white' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* Styles ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#007AFF',
  },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  videoButton: { padding: 5 },
  videoButtonText: { fontSize: 24 },

  bubble: {
    maxWidth: '70%',
    padding: 10,
    marginVertical: 4,
    borderRadius: 10,
  },
  left: { backgroundColor: '#eee', alignSelf: 'flex-start' },
  right: { backgroundColor: '#4e8cff', alignSelf: 'flex-end' },
  
  bubbleText: {
    color: '#000',
    ...(Platform.OS === 'web'
      ? { wordBreak: 'break-word', whiteSpace: 'pre-wrap' }
      : {}),
  },

  inputRow: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  sendBtn: {
    backgroundColor: '#4e8cff',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginLeft: 8,
  },
});