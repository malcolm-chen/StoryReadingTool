/**
 * Upload user audio clips directly to S3 (presigned PUT), then save chat metadata to Postgres via Flask.
 */
export async function uploadChatHistoryToBackend({
  apiUrl,
  user,
  title,
  page,
  chatHistory,
}) {
  const items = [];
  for (let index = 0; index < chatHistory.length; index += 1) {
    const item = chatHistory[index];
    let audioKey = null;
    if (item.role === 'user' && item.formatted?.file?.blob) {
      const presignRes = await fetch(`${apiUrl}/api/s3/presign_audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          title,
          page,
          index,
        }),
      });
      const presignData = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok || !presignData.uploadUrl || !presignData.key) {
        throw new Error(
          presignData.message || `presign failed (${presignRes.status})`
        );
      }
      // Some browsers automatically set Content-Type from Blob.type, which triggers CORS preflight.
      // We create a new Blob with empty type to avoid sending `content-type` header.
      const originalBlob = item.formatted.file.blob;
      const uploadBlob = new Blob([originalBlob], { type: '' });

      const putRes = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        body: uploadBlob,
      });
      if (!putRes.ok) {
        throw new Error(`S3 upload failed (${putRes.status})`);
      }
      audioKey = presignData.key;
    }
    items.push({
      id: item.id,
      role: item.role,
      content: item.content?.[0]?.transcript ?? null,
      audio: audioKey,
    });
  }

  const res = await fetch(`${apiUrl}/api/chat_history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user,
      title,
      page: String(page),
      items,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `save chat failed (${res.status})`);
  }
  return res.json();
}
