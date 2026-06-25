export interface INetworthRepository {
	getTotalBalance(userId: string): Promise<number>;
}
