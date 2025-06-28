import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { userName, userId } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Chat with {userName}</Text>
        <TouchableOpacity 
          style={styles.videoButton}
          onPress={() => navigation.navigate('VideoCall', { userId, userName })}
        >
          <Text style={styles.videoButtonText}>📹</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.messagesArea}>
        <Text>Messages will appear here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#007AFF',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  videoButton: {
    padding: 5,
  },
  videoButtonText: {
    fontSize: 24,
  },
  messagesArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});