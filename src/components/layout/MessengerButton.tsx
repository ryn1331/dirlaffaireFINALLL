import { MESSENGER_URL } from "@/lib/messenger";

export default function MessengerButton() {
  return (
    <a
      href={MESSENGER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-4 z-40 w-13 h-13 rounded-full bg-foreground flex items-center justify-center shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300"
      aria-label="Contacter sur Messenger"
      title="Contacter sur Messenger"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-background" aria-hidden="true">
        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.18.16.15.26.36.27.58l.05 1.82c.02.62.66 1.03 1.24.79l2.03-.8c.18-.07.38-.09.56-.05.94.26 1.94.4 2.97.4 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm5.95 7.57l-2.9 4.6c-.46.73-1.45.92-2.14.4l-2.3-1.73a.6.6 0 0 0-.72 0l-3.11 2.36c-.42.31-.96-.18-.69-.63l2.9-4.6c.46-.73 1.45-.92 2.14-.4l2.3 1.73a.6.6 0 0 0 .72 0l3.11-2.36c.42-.31.96.18.69.63z"/>
      </svg>
    </a>
  );
}
