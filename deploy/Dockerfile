# syntax=docker/dockerfile:1
# Build context: the repository root (compose.yaml sets `context: ..`).
# Base images are pinned by digest (multi-arch index); Dependabot (docker, /deploy) proposes updates.

FROM docker.io/library/node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:747cbade5bfd918a175ac32f8f1d931edec2c7d0d5397a3de72eaef1ac1f66d2 AS api
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props ./
COPY src/Keemese.Api/Keemese.Api.csproj src/Keemese.Api/packages.lock.json src/Keemese.Api/
RUN dotnet restore src/Keemese.Api/Keemese.Api.csproj --locked-mode
COPY src/Keemese.Api/ src/Keemese.Api/
RUN dotnet publish src/Keemese.Api/Keemese.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:8af87eba5e7cdafb1514d7388be287365da97c132509e84dfe252ffd552398ca
WORKDIR /app
COPY --from=api /app ./
COPY --from=web /src/web/dist ./wwwroot
# `app` is the non-root user the .NET images ship; it must own the data directory.
RUN mkdir /data && chown app:app /data
ENV ASPNETCORE_HTTP_PORTS=8080 \
    DATA_DIR=/data
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "Keemese.Api.dll"]
