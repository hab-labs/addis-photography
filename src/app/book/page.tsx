import { Metadata } from "next";
import { BookingClient } from "./BookingClient";

export const metadata: Metadata = {
  title: "Book a Photo Shoot | Addis Photography",
  description: "Schedule your portrait, graduation, wedding, or family photoshoot session with Addis Photography Studio.",
};

export default function BookPage() {
  return <BookingClient />;
}
