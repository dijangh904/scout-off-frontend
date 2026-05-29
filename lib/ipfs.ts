export const DEFAULT_IPFS_FALLBACKS = ['https://ipfs.io/ipfs', 'https://cloudflare-ipfs.com/ipfs'];

const PRIMARY_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs';

export async function uploadToIPFS(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch('/api/ipfs/upload', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.cid as string;
}

export async function ipfsUrl(cid: string, fallbacks: string[] = DEFAULT_IPFS_FALLBACKS): Promise<string> {
  const gateways = [PRIMARY_GATEWAY, ...fallbacks];
  
  for (let i = 0; i < gateways.length; i++) {
    const gateway = gateways[i];
    const url = `${gateway}/${cid}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, { 
        method: 'HEAD', 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return url;
      } else if (i < gateways.length - 1) {
        console.warn(`Primary gateway failed (${response.status}), falling back to ${gateways[i + 1]}`);
      }
    } catch (error) {
      if (i < gateways.length - 1) {
        console.warn(`Gateway request failed, falling back to ${gateways[i + 1]}`, error);
      }
    }
  }
  
  throw new Error('All IPFS gateways exhausted');
}
