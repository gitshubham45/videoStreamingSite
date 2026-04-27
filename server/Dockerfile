FROM golang:1.25-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o /app/server .

FROM alpine:3.22

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY --from=build /app/server /app/server
COPY transcode.sh /app/transcode.sh
COPY scripts /app/scripts

RUN chmod +x /app/server /app/transcode.sh /app/scripts/transcode.sh \
    && mkdir -p /app/uploads /app/videos

ENV PORT=8000

EXPOSE 8000

CMD ["/app/server"]
