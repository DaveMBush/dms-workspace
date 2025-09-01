export function createAccountQuery(
  sellDateStart: Date,
  sellDateEnd: Date
): {
  include: {
    trades: { where: { sell_date: { gte: Date; lt: Date } } };
    divDeposits: { where: { date: { gte: Date; lt: Date } } };
  };
} {
  return {
    include: {
      trades: {
        where: {
          sell_date: {
            gte: sellDateStart,
            lt: sellDateEnd,
          },
        },
      },
      divDeposits: {
        where: {
          date: {
            gte: sellDateStart,
            lt: sellDateEnd,
          },
        },
      },
    },
  };
}
