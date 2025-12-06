# React Hooks

Loly Framework proporciona hooks React personalizados para facilitar el desarrollo.

## usePageProps

Hook para acceder a props y parámetros de la página.

### Uso Básico

```tsx
import { usePageProps } from "@lolyjs/core/hooks";

export default function MyPage() {
  const { props, params } = usePageProps();
  
  return (
    <div>
      <h1>{props.title}</h1>
      <p>ID: {params.id}</p>
    </div>
  );
}
```

### Con TypeScript

```tsx
type PageProps = {
  post: {
    id: string;
    title: string;
    content: string;
  };
};

export default function PostPage() {
  const { props } = usePageProps<PageProps>();
  
  return (
    <article>
      <h1>{props.post.title}</h1>
      <div>{props.post.content}</div>
    </article>
  );
}
```

### Actualización Automática

El hook se actualiza automáticamente cuando:
- Se llama `revalidate()`
- Se navega a otra página
- Se actualiza `window.__FW_DATA__`

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
import { usePageProps } from "@lolyjs/core/hooks";
import { useState, useEffect } from "react";

export function useAuth() {
  const { props } = usePageProps();
  const [user, setUser] = useState(props.user);
  
  useEffect(() => {
    // Actualizar cuando cambien los props
    if (props.user) {
      setUser(props.user);
    }
  }, [props.user]);
  
  return {
    user,
    isAuthenticated: !!user,
  };
}
```

### Usar Hook Personalizado

```tsx
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedPage() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return <div>Welcome, {user.name}!</div>;
}
```

## Ejemplos Completos

### Página con Datos

```tsx
import { usePageProps } from "@lolyjs/core/hooks";

type PageProps = {
  launches: Array<{
    id: string;
    name: string;
    date: string;
  }>;
};

export default function LaunchesPage() {
  const { props } = usePageProps<PageProps>();
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
import { usePageProps } from "@lolyjs/core/hooks";
import { revalidate } from "@lolyjs/core/client-cache";

export default function DataPage() {
  const { props } = usePageProps();
  
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

## Próximos Pasos

- [Components](./14-components.md) - Componentes del framework
- [Server Loaders](./04-server-loaders.md) - Data fetching
