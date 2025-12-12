# React Hooks

Loly Framework proporciona hooks React personalizados para facilitar el desarrollo.

## useBroadcastChannel

Hook para comunicación entre pestañas usando BroadcastChannel API.

### Uso Básico

```tsx
import { useBroadcastChannel } from "@lolyjs/core/hooks";

export default function SyncComponent() {
  const { send, lastMessage } = useBroadcastChannel("my-channel");
  
  const handleClick = () => {
    send({ type: "SYNC", data: "value" });
  };
  
  return (
    <div>
      <button onClick={handleClick}>Sync</button>
      {lastMessage && <div>Last: {JSON.stringify(lastMessage)}</div>}
    </div>
  );
}
```

### Con TypeScript

```tsx
type Message = {
  type: "SYNC" | "UPDATE";
  data: any;
};

export default function Component() {
  const { send, lastMessage } = useBroadcastChannel<Message>("my-channel");
  
  // ...
}
```

## Hooks Personalizados

### Crear Hooks Reutilizables

```tsx
// hooks/useAuth.ts
import { useState, useEffect } from "react";

export function useAuth({ user: initialUser }) {
  const [user, setUser] = useState(initialUser);
  
  useEffect(() => {
    // Actualizar cuando cambien los props
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser]);
  
  return {
    user,
    isAuthenticated: !!user,
  };
}
```

### Usar Hook Personalizado

```tsx
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedPage({ props }) {
  const { user, isAuthenticated } = useAuth(props);
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return <div>Welcome, {user.name}!</div>;
}
```

## Ejemplos Completos

### Página con Datos

```tsx
type PageProps = {
  launches: Array<{
    id: string;
    name: string;
    date: string;
  }>;
};

export default function LaunchesPage({ props }: { props: PageProps }) {
  const { launches = [] } = props;
  
  return (
    <div>
      <h1>Launches</h1>
      {launches.map(launch => (
        <div key={launch.id}>
          <h2>{launch.name}</h2>
          <p>{launch.date}</p>
        </div>
      ))}
    </div>
  );
}
```

### Componente con Revalidación

```tsx
import { revalidate } from "@lolyjs/core/client-cache";

export default function DataPage({ props }) {
  const handleRefresh = async () => {
    await revalidate();
  };
  
  return (
    <div>
      <button onClick={handleRefresh}>Refresh</button>
      <div>{JSON.stringify(props)}</div>
    </div>
  );
}
```

## Mejores Prácticas

1. **Type Safety**: Tipa tus props con TypeScript
2. **Default Values**: Proporciona valores por defecto
3. **Revalidación**: Usa `revalidate()` cuando sea necesario
4. **Hooks Personalizados**: Crea hooks reutilizables para lógica común
5. **Props como Parámetros**: Los componentes reciben props directamente como parámetros

## Próximos Pasos

- [Components](./14-components.md) - Componentes del framework
- [Server Loaders](./04-server-loaders.md) - Data fetching
