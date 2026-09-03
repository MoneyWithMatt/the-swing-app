"use client";
import Image from "next/image";
import { LinkButton } from "@/components/ui/primitives";

type DirectoryCoach = { id: string; displayName: string; description: string; photoUrl?: string; sports: string[] };
export function CoachDirectory({ coaches }: { coaches: DirectoryCoach[] }) {
  const golfCoaches = coaches.filter((coach) => coach.sports.includes("golf"));
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{golfCoaches.length ? golfCoaches.map((coach) => <article key={coach.id} className="flex flex-col overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm">
    {coach.photoUrl ? <Image src={coach.photoUrl} alt={coach.displayName} width={640} height={400} className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-moss/10 text-4xl font-black text-moss">{coach.displayName.charAt(0)}</div>}
    <div className="flex flex-1 flex-col p-4"><h2 className="text-xl font-bold">{coach.displayName}</h2><p className="mt-2 flex-1 text-sm leading-6 text-ink/65">{coach.description}</p><LinkButton href={`/new?coach=${coach.id}`} className="mt-4 w-full">Choose {coach.displayName}</LinkButton></div>
  </article>) : <div className="rounded-lg border border-dashed border-ink/20 bg-white p-8 text-center sm:col-span-2 lg:col-span-3"><p className="font-bold">No golf coaches are listed yet.</p><p className="mt-1 text-sm text-ink/55">Check back when another coach profile has been added.</p></div>}</div>;
}
