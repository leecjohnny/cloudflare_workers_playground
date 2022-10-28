var lookup_name = 'realDonaldTrump';

function sendEmail(user_name) {
    send_request = new Request('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: 'example@example.com', name: 'Example' }],
          },
        ],
        from: {
          email: 'example@example.com',
          name: 'Example',
        },
        subject: user_name + ' is now active on Twitter',
        content: [
          {
            type: 'text/plain',
            value: user_name,
          },
        ],
      }),
    })
    return send_request;
  }

/** * gatherResponse awaits and returns a response body as a string. * Use await gatherResponse(..) in an async function to get the response body * @param {Response} response */
async function gatherResponse(response) {
  const {
    headers
  } = response;
  const contentType = headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (data.hasOwnProperty('data')) {
      const valid_usernames = []
      for (let i of data.data){
        valid_usernames.push(i.username);
        if (i.username === lookup_name) {
          const should_send = await check_user_rdt.get('recently_sent_email_dev');
          if (should_send === null) {
            const e_response = await fetch(sendEmail(i.username));
            if (e_response.ok) {
              await check_user_rdt.put('recently_sent_email_dev', '1', {expirationTtl: 60*60*3});
            }
          }

        }
      }
      return JSON.stringify(valid_usernames);
    }
    return JSON.stringify([]);
  }
  return JSON.stringify([]);
}

async function handleRequest(request) {
  const { searchParams } = new URL(request.url);
  let username = searchParams.get('names');
  let key = searchParams.get('key');
  if (key !== AUTH_KEY)
  {
    return new Response('Unauthorized', { status: 401 });
  }
  const url = new URL('https://api.twitter.com/2/users/by');
  url.searchParams.append('usernames', username);
  url.searchParams.append('user.fields', 'description,public_metrics');
  const init = {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'Authorization': TWITTER_TOKEN,
    },
  };
  const response = await fetch(url.toString(), init);
  const results = await gatherResponse(response);
  return new Response(results);
}


async function triggerEvent(scheduledTime) {
  const url = new URL('https://api.twitter.com/2/users/by');
  url.searchParams.append('usernames', lookup_name);
  url.searchParams.append('user.fields', 'description,public_metrics');
  const init = {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'Authorization': TWITTER_TOKEN,
    },
  };
  const response = await fetch(url.toString(), init);
  const results = await gatherResponse(response);
}


addEventListener('fetch', event => {
  return event.respondWith(handleRequest(event.request));
});

addEventListener("scheduled", (event) => {
  event.waitUntil(triggerEvent(event.scheduledTime));
});
