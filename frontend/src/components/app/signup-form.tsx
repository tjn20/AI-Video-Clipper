"use client";
import { Github } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { useForm } from "react-hook-form";
import { SIGNUP_SHCEMA, type SignUpForm } from "~/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "~/components/ui/form";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { signUp } from "~/actions/auth";
import { useRouter } from "next/navigation";

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const form = useForm<SignUpForm>({
    resolver: zodResolver(SIGNUP_SHCEMA),
  });
  const router = useRouter();
  const onSubmit = async (data: SignUpForm) => {
    setIsSubmitting(true);

    try {
      const { status, message } = await signUp(data);
      if (status === 422 || status === 400)
        throw new Response(message, {
          status,
        });
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error)
        throw new Response(result.error, {
          status: 400,
        });
      router.push("/");
    } catch (error) {
      if (error instanceof Response && error.status === 422) {
        const message = await error.text();
        toast.warning(message);
      } else {
        console.log(error);
        toast.error("Something went wrong!");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Create an account with Github</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={() => {
                    setIsSubmitting(true);
                    signIn("github", {
                      redirect: false,
                    })
                      .then(() => setTimeout(() => router.push("/"), 1000))
                      .catch((error) => toast.error("Something Went Wrong!"))
                      .finally(() => {
                        setIsSubmitting(false);
                      });
                  }}
                >
                  <Github />
                  Login with Github
                </Button>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    Or continue with
                  </span>
                </div>
                <div className="flex flex-col items-center justify-between gap-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="w-full space-y-0">
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="w-full space-y-0">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="w-full space-y-0">
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Password"
                            type="password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    disabled={isSubmitting}
                    type="submit"
                    className="mt-3 w-full"
                  >
                    {!isSubmitting ? "Sign up" : "Signing Up"}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  Have an account already?{" "}
                  <Link href="#" className="underline underline-offset-4">
                    Login
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
