// ============================================================
//  WhisperBox — Message Grouping Utility
//  Groups consecutive messages from same sender
// ============================================================

export function groupMessages(messages) {
  if (!messages || messages.length === 0) return [];

  const groups = [];
  let currentGroup = [];
  let currentSenderId = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const senderId = msg.from_user_id;

    // Check if sender changed or gap between messages > 5 minutes
    const timeDiff = currentGroup.length > 0
      ? new Date(msg.created_at) - new Date(currentGroup[currentGroup.length - 1].created_at)
      : 0;

    const GAP_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    if (currentSenderId !== senderId || timeDiff > GAP_THRESHOLD) {
      // Start new group
      if (currentGroup.length > 0) {
        groups.push({
          senderId: currentSenderId,
          messages: currentGroup,
        });
      }
      currentGroup = [msg];
      currentSenderId = senderId;
    } else {
      // Add to current group
      currentGroup.push(msg);
    }
  }

  // Push last group
  if (currentGroup.length > 0) {
    groups.push({
      senderId: currentSenderId,
      messages: currentGroup,
    });
  }

  return groups;
}
