import { ServerToClientExample } from './ServerToClientExample.client'

export const SectionWrapper = (props: any) => {
  return (
    <div>
        <h1>Example: {props?.title}</h1>
        <ServerToClientExample {...props} />
    </div>
  )
}
