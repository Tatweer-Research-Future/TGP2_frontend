import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-16">
      <img
        src="/assets/art/404%20Error%20with%20a%20cute%20animal-amico.svg"
        alt="Page not found"
        className="max-w-md w-full h-auto mx-auto"
      />
      <div className="mt-6 text-center">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground mt-1">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <div className="mt-4">
          <Link to="/home" className="underline">
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}














