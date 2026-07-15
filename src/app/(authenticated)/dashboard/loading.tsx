import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonBox className="h-8 w-48" />
        <SkeletonBox className="mt-2 h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <SkeletonBox className="h-4 w-28" />
              <SkeletonBox className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <SkeletonBox className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <SkeletonBox className="h-4 w-28" />
              <SkeletonBox className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <SkeletonBox className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <SkeletonBox className="h-32 w-full rounded-lg" />

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <SkeletonBox className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <SkeletonBox className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <SkeletonBox className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBox key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
