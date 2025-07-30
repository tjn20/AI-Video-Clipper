"use client";
import Link from "next/link";
import { Button } from "../ui/button";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { LogOut, User as UserIcon } from "lucide-react";
import { AVATAR_FORMATTER } from "~/lib/utils";
import { signOut } from "next-auth/react";
export default function Navbar({
  user,
}: {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    credits: number | null;
  };
}) {
  return (
    <div className="bg-sidebar sticky top-0 z-10 flex items-center justify-between px-3 py-3 shadow-md">
      <Link href="/">
        <Button
          variant="link"
          className="flex items-center justify-center text-lg hover:no-underline"
        >
          <Image
            src="/favicon.ico"
            alt="Logo"
            width={40}
            height={40}
            className="bg-primary rounded p-3"
            color="white"
          />
        </Button>
      </Link>
      <div className="flex items-center justify-between gap-3">
        <Link href="/billing" passHref className="flex items-baseline">
          <Button
            size="sm"
            className="group relative h-8 w-28 cursor-pointer overflow-hidden"
          >
            <span className="absolute inset-0 flex transform items-center justify-center transition-transform duration-300 group-hover:translate-y-full">
              {user.credits} Credits
            </span>
            <span className="absolute inset-0 flex translate-y-full transform items-center justify-center transition-transform duration-300 group-hover:translate-y-0">
              Buy Now
            </span>
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="profile" size="icon">
              <Avatar>
                <AvatarFallback>
                  {AVATAR_FORMATTER(user.name || user.email || "")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserIcon />
                <span>Profile</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                signOut({
                  redirectTo: "/login",
                })
              }
            >
              <LogOut />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
