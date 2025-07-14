// src/screens/VideoCallScreen.tsx
import React, { useEffect, useRef } from 'react';
import { RootStackParamList } from '../types/navigation';   // << ensure correct path

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';

import useWebRTC from '../hooks/useWebRTC';
import { useRoute, RouteProp } from '@react-navigation/native';

// ─── Conditional native import ────────────────────────────
import type { MediaStream } from 'react-native-webrtc';
let RTCView: any = null;
if (Platform.OS !== 'web') {
  const webrtc = require('react-native-webrtc');
  RTCView = webrtc.RTCView;
}
// ──────────────────────────────────────────────────────────

type Props = { route: { params: { partnerId: string } } };

export default function VideoCallScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoCall'>>();

  const { partnerId } = route.params;

  const { local, remote, startCall } = useWebRTC(Number(partnerId));

  /* web refs */
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  /* kick off call once */
  useEffect(() => {
    startCall();
  }, []);

  /* bind web streams whenever they change */
  useEffect(() => {
    if (Platform.OS === 'web' && localRef.current && local) {
      (localRef.current as any).srcObject = local as unknown as MediaStream;
      localRef.current.muted = true;
      localRef.current.play();
    }
  }, [local]);

  useEffect(() => {
    if (Platform.OS === 'web' && remoteRef.current && remote) {
      (remoteRef.current as any).srcObject = remote as unknown as MediaStream;
      remoteRef.current.play();
    }
  }, [remote]);

  /* ---------- loading ---------- */
  if (!local) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 8 }}>Opening camera…</Text>
      </View>
    );
  }

  /* ---------- render ---------- */
  return (
    <View style={styles.row}>
      {/* LOCAL */}
      {Platform.OS === 'web' ? (
        <video ref={localRef} style={styles.webVid} playsInline autoPlay />
      ) : (
        <RTCView
          streamURL={(local as any).toURL()}
          style={styles.nativeVid}
          objectFit="cover"
        />
      )}

      {/* REMOTE */}
      {Platform.OS === 'web' ? (
        <video ref={remoteRef} style={styles.webVid} playsInline autoPlay />
      ) : remote ? (
        <RTCView
          streamURL={(remote as any).toURL()}
          style={styles.nativeVid}
          objectFit="cover"
        />
      ) : (
        <View style={styles.wait}>
          <Text style={{ color: '#fff' }}>Waiting for peer…</Text>
        </View>
      )}
    </View>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flex: 1, flexDirection: 'row', backgroundColor: '#000' },
  nativeVid: { flex: 1 },
  webVid: { width: '50%', height: '100%', backgroundColor: '#000' },
  wait: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});