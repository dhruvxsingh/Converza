export type RootStackParamList = {
  Login: undefined;
  ChatList: undefined;
  Chat: { userId: string; userName: string };
  VideoCall: { userId: string; userName: string };
};