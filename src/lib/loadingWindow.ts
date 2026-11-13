/** Start work immediately; keep its UI lock for at least two seconds, on errors too.
 * This is a presentation window, never an extra request, retry or server delay. */
export const MINIMUM_LOADING_MS = 2000;
export async function minimumWindow<T>(work:()=>T|PromiseLike<T>):Promise<T>{
 const timer=new Promise<void>(resolve=>setTimeout(resolve,MINIMUM_LOADING_MS));
 let result:Promise<T>;
 try{result=Promise.resolve(work())}catch(error){result=Promise.reject(error)}
 const [outcome]=await Promise.all([
  result.then(value=>({ok:true as const,value}),error=>({ok:false as const,error})),
  timer
 ]);
 if(!outcome.ok)throw outcome.error;
 return outcome.value;
}
