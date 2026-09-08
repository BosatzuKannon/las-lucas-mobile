export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  WaitingRoom: { roomId: string };
  CategoryVoting: { roomId: string };
  ActiveGame: { roomId: string };
};