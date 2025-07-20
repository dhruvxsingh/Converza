// src/hooks/useWebRTC.ts
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import useChatSocket from './useChatSocket';

// Import RTCPeerConnection and related types
let RTCPeerConnection: any;
let RTCSessionDescription: any;
let RTCIceCandidate: any;
let mediaDevices: any;

if (Platform.OS === 'web') {
  RTCPeerConnection = window.RTCPeerConnection;
  RTCSessionDescription = window.RTCSessionDescription;
  RTCIceCandidate = window.RTCIceCandidate;
} else {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  mediaDevices = webrtc.mediaDevices;
}

type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callState: CallState;
  startCall: () => Promise<void>;
  acceptCall: () => Promise<void>;
  endCall: () => void;
  incomingOffer: any;
}

export default function useWebRTC(partnerId: number): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);

  // WebSocket for signaling
const { send } = useChatSocket(partnerId, async (msg: any) => {
    console.log('Received WebSocket message:', msg);
    
    if (!msg.type) return;
    
    switch (msg.type) {
      case 'call-offer':
        console.log('Received call offer');
        setIncomingOffer(msg.offer);
        setCallState('incoming');
        break;
        
      case 'call-answer':
        console.log('Received call answer');
        if (pcRef.current && callState === 'calling') {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.answer));
          setCallState('connected');
          
          // Process buffered ICE candidates
          console.log(`Processing ${iceCandidateBuffer.current.length} buffered ICE candidates`);
          for (const candidate of iceCandidateBuffer.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          iceCandidateBuffer.current = [];
        }
        break;
        
      case 'ice-candidate':
        console.log('Received ICE candidate');
        if (pcRef.current && pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } else {
          // Buffer the candidate
          console.log('Buffering ICE candidate');
          iceCandidateBuffer.current.push(msg.candidate);
        }
        break;
        
      case 'call-end':
        console.log('Call ended by peer');
        cleanup();
        break;
    }
  });
  

  // Get user media
  const getUserMedia = async () => {
    try {
      let stream: MediaStream;
      
      if (Platform.OS === 'web') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      } else {
        stream = await mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true
        });
      }
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  };

  // Create peer connection
  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        console.log('✅ Peer connection established successfully!');
      } else if (pc.iceConnectionState === 'failed') {
        console.error('❌ ICE connection failed');
        cleanup();
      }
    };

    // Also add signaling state monitoring
    pc.onsignalingstatechange = () => {
      console.log('Signaling state:', pc.signalingState);
    };
    
    // Add local stream tracks
    if (localStreamRef.current) {
      console.log('Adding local tracks to peer connection');
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
        console.log(`Adding track: ${track.kind} - ${track.label}`);
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.error('No local stream available when creating peer connection!');
    }

    // Handle remote stream - Fix TypeScript error here
    pc.ontrack = (event: RTCTrackEvent) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log('Setting remote stream');
        setRemoteStream(event.streams[0]);
      } else {
        console.error('No streams in track event!');
      }
    };

    // Handle ICE candidates - Fix TypeScript error here
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        send({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // Start outgoing call
  const startCall = async () => {
    try {
      console.log('Starting call...');
      setCallState('calling');
      
      // Get user media first
      await getUserMedia();
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer through WebSocket
      send({
        type: 'call-offer',
        offer: offer
      });
      
      // Also send a chat message to notify about the call
      send('📞 Started a video call');
      
    } catch (error) {
      console.error('Error starting call:', error);
      cleanup();
    }
  };

  // Accept incoming call
const acceptCall = async () => {
  try {
    console.log('Accepting call...');
    
    // Get user media first
    await getUserMedia();
    
    // Create peer connection
    const pc = createPeerConnection();
    
    // Set remote description from offer
    console.log('Setting remote description from offer');
    await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
    
    // Create answer
    console.log('Creating answer');
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    // Send answer through WebSocket
    send({
      type: 'call-answer',
      answer: answer
    });
    
    // Process buffered ICE candidates
    console.log(`Processing ${iceCandidateBuffer.current.length} buffered ICE candidates`);
    for (const candidate of iceCandidateBuffer.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding buffered ICE candidate:', e);
      }
    }
    iceCandidateBuffer.current = [];
    
    setCallState('connected');
    setIncomingOffer(null);
    
  } catch (error) {
    console.error('Error accepting call:', error);
    cleanup();
  }
};

  // End call
  const endCall = () => {
    console.log('Ending call...');
    
    // Send end signal
    send({ type: 'call-end' });
    
    // Send a chat message about call ending
    if (callState === 'connected') {
      send('📞 Call ended');
    }
    
    cleanup();
  };

  // Cleanup function
  const cleanup = () => {
    console.log('Cleaning up...');
    iceCandidateBuffer.current = [];
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      localStreamRef.current = null;
    }
    
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Reset states
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setIncomingOffer(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    localStream,
    remoteStream,
    callState,
    startCall,
    acceptCall,
    endCall,
    incomingOffer
  };
}
