# Usa l'immagine SDK per compilare
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# COPIA SEMPLIFICATA:
# Dato che il Dockerfile e il .csproj sono vicini, copiamo direttamente il file
COPY ["FantasyBasket.API.csproj", "./"]
RUN dotnet restore "FantasyBasket.API.csproj"

# Copia tutto il resto dei file
COPY . .

# Compila
RUN dotnet build "FantasyBasket.API.csproj" -c Release -o /app/build

# Pubblica
FROM build AS publish
RUN dotnet publish "FantasyBasket.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime finale
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Imposta la porta per Render
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "FantasyBasket.API.dll"]