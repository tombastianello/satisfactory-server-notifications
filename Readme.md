## Satisfactory Server Notification
Simple application intended to be used as a sidecar to the satisfactory dedicated server container. This can also be run manually or as a service, although config examples are not provided at the moment.

### So what does it do?
For the moment functionality is basic, however, this can be expanded in the future. Currently this will notify a discord channel via webhook when the following events occur:
- Server startup.
- Server startup complete.
- Game is saved (currently only when no players are online to avoid spamming).
- Player connects to the server.
- Player disconnects from the server.

### WARNING
This is still really hacky at the moment and I can't promise it will work reliably.

### Configuration
To configure the application, use the following 2 environment variables:
- **LOG_PATH**: Directory where the logs are stored, defaults to `/config/gamefiles/FactoryGame/Saved/Logs`, this is the default for the docker deployment using the `wolveix/satisfactory-server` image.
- **WEBHOOK_PATH**: URL path of the discord webhook, in the following format: `/api/webhooks/<wh_id>/<wh_token>`.

### Kubernetes Example
Example of using this as a sidecar for the `wolveix/satisfactory-server` container.
```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: satisfactory
  namespace: game-servers
spec:
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: satisfactory
  template:
    metadata:
      labels:
        app: satisfactory
    spec:
      hostNetwork: true
      containers:
      - name: satisfactory
        env:
          - name: MAXPLAYERS
            value: "6"
          - name: STEAMBETA
            value: "false"
        image: wolveix/satisfactory-server:latest
        resources:
          requests:
            cpu: "1000m"
            memory: "4Gi"
          limits:
            cpu: "2000m"
            memory: "8Gi"
        ports:
        - containerPort: 15777
        - containerPort: 15000
        - containerPort: 7777
        volumeMounts:
            - name: data
              mountPath: /config
      - name: discord-notifications
        env:
          - name: WEBHOOK_PATH
            value: "/api/webhooks/<wh_id>/<wh_token>"
        image: ghcr.io/tombastianello/satisfactory-server-notifications:latest
        volumeMounts:
            - name: data
              mountPath: /config
      volumes:
        - name: data
          hostPath:
            path: /path/to/satisfactory/dir
            type: Directory
```