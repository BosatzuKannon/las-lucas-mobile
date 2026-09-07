export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  WaitingRoom: { roomId: string };
  ActiveGame: { roomId: string };
};