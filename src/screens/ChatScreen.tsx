// src/screens/ChatScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
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

  const { userName, userId } = route.params;
  const partnerId = Number(userId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showIncomingCall, setShowIncomingCall] = useState(false);

  const flatListRef = useRef<FlatList<any>>(null);
  
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Load history
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

  // Live socket with incoming call detection
  const { send } = useChatSocket(partnerId, (msg) => {
  // Handle incoming call
  if (typeof msg === 'object' && 'type' in msg) {
    if ((msg as any).type === 'call-offer') {
      setShowIncomingCall(true);
      return;
    }
    // Ignore other signaling messages
    return;
  }
  
  // Handle regular chat messages
  if (typeof msg === 'object' && 'content' in msg && 'id' in msg) {
    setMessages(prev => [...prev, msg as ChatMessage]);
  }
});

  // Send handler
  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    send(text);
    setInput('');
  };

  // Start video call
  const startVideoCall = () => {
    navigation.navigate('VideoCall', { partnerId: userId });
  };

  // Accept incoming call
  const acceptIncomingCall = () => {
    setShowIncomingCall(false);
    navigation.navigate('VideoCall', { partnerId: userId });
  };

  // Decline incoming call
  const declineIncomingCall = () => {
    setShowIncomingCall(false);
    send({ type: 'call-end' });
    send('📞 Missed call');
  };

  // Render message item
  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.bubble,
        item.sender_id === partnerId ? styles.left : styles.right,
      ]}
    >
      <Text style={styles.bubbleText}>{item.content}</Text>
      <Text style={styles.timeText}>
        {new Date(item.created_at).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Chat with {userName}</Text>
        <TouchableOpacity
          style={styles.videoButton}
          onPress={startVideoCall}
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
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={{ color: 'white' }}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Incoming Call Modal */}
      <Modal
        visible={showIncomingCall}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Incoming Video Call</Text>
            <Text style={styles.modalText}>{userName} is calling you...</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.acceptButton]}
                onPress={acceptIncomingCall}
              >
                <Text style={styles.modalButtonText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.declineButton]}
                onPress={declineIncomingCall}
              >
                <Text style={styles.modalButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
    fontSize: 16,
    ...(Platform.OS === 'web'
      ? { wordBreak: 'break-word', whiteSpace: 'pre-wrap' }
      : {}),
  },
  
  timeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    paddingVertical: 8,
  },
  sendBtn: {
    backgroundColor: '#4e8cff',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginLeft: 8,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 10,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});