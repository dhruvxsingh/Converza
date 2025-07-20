// src/screens/VideoCallScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import useWebRTC from '../hooks/useWebRTC';

// Conditional native import
let RTCView: any = null;
if (Platform.OS !== 'web') {
  const webrtc = require('react-native-webrtc');
  RTCView = webrtc.RTCView;
}

export default function VideoCallScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoCall'>>();
  const navigation = useNavigation();
  const { partnerId } = route.params;

  const {
    localStream,
    remoteStream,
    callState,
    startCall,
    acceptCall,
    endCall,
  } = useWebRTC(Number(partnerId));

  // Web video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Start call on mount (if not incoming)
  useEffect(() => {
    if (callState === 'idle') {
      startCall();
    }
  }, []);

  // Handle web video streams
  useEffect(() => {
    if (Platform.OS === 'web' && localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream as any;
    }
  }, [localStream]);

  useEffect(() => {
    if (Platform.OS === 'web' && remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream as any;
    }
  }, [remoteStream]);

  // Handle call end
  const handleEndCall = () => {
    endCall();
    navigation.goBack();
  };

  // Render based on call state
  const renderContent = () => {
    switch (callState) {
      case 'calling':
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.statusText}>Calling...</Text>
            <TouchableOpacity style={styles.endButton} onPress={handleEndCall}>
              <Text style={styles.endButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );

      case 'incoming':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.statusText}>Incoming Video Call</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.acceptButton} onPress={acceptCall}>
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineButton} onPress={handleEndCall}>
                <Text style={styles.buttonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'connected':
      case 'idle':
        return (
          <>
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              Local Stream: {localStream ? 'Active' : 'None'}
            </Text>
            <Text style={styles.debugText}>
              Remote Stream: {remoteStream ? 'Active' : 'None'}
            </Text>
          </View>
            {/* Video Streams Container */}
            <View style={styles.videoContainer}>
              {/* Remote Stream (Full Screen) */}
              {remoteStream ? (
                Platform.OS === 'web' ? (
                  <video
                    ref={remoteVideoRef}
                    style={styles.remoteVideoWeb}
                    autoPlay
                    playsInline
                  />
                ) : (
                  <RTCView
                    streamURL={(remoteStream as any).toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                  />
                )
              ) : (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.placeholderText}>Waiting for peer video...</Text>
                </View>
              )}

              {/* Local Stream (Picture-in-Picture) */}
              {localStream && (
                <View style={styles.localVideoContainer}>
                  {Platform.OS === 'web' ? (
                    <video
                      ref={localVideoRef}
                      style={styles.localVideoWeb}
                      autoPlay
                      playsInline
                      muted
                    />
                  ) : (
                    <RTCView
                      streamURL={(localStream as any).toURL()}
                      style={styles.localVideo}
                      objectFit="cover"
                      zOrder={1}
                    />
                  )}
                </View>
              )}
            </View>

            {/* Call Controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
                <Text style={styles.endCallButtonText}>End Call</Text>
              </TouchableOpacity>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 20,
    marginVertical: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 30,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginHorizontal: 10,
  },
  debugInfo: {
  position: 'absolute',
  top: 50,
  left: 10,
  zIndex: 100,
},
debugText: {
  color: 'yellow',
  fontSize: 14,
  backgroundColor: 'rgba(0,0,0,0.5)',
  padding: 5,
},
  declineButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginHorizontal: 10,
  },
  endButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 20,
  },
  endButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
  },
  remoteVideoWeb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as any,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 10,
    zIndex: 10,
    backgroundColor: '#000',
  },
  localVideo: {
    flex: 1,
  },
  localVideoWeb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as any,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
  },
  endCallButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});