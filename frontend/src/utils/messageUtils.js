export const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const groupMessagesByDay = (messages) => {
  if (!messages || messages.length === 0) return [];
  
  const groups = [];
  let currentGroup = { date: null, messages: [] };

  messages.forEach(message => {
    const messageDate = new Date(message.createdAt).toDateString();
    
    if (messageDate !== currentGroup.date) {
      if (currentGroup.messages.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = { date: messageDate, messages: [message] };
    } else {
      currentGroup.messages.push(message);
    }
  });

  if (currentGroup.messages.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

export const getBackendMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${backendUrl}${url}`;
};
