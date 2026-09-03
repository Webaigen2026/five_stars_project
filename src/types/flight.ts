export type Flight = {
    id: string;
    airline: string;
  
    origin: string;
    originCode: string;
  
    destination: string;
    destinationCode: string;
  
    departureTime: string;
    arrivalTime: string;
  
    duration: string;
  
    price: number;
    seatsLeft: number;
  };