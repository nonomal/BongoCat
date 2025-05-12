use futures_util::sink::SinkExt;
use std::{error::Error, sync::Arc};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::{Mutex, OnceCell},
};
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};

static WS_SENDER: OnceCell<Arc<Mutex<Option<WebSocketStream<TcpStream>>>>> = OnceCell::const_new();

pub async fn start() -> Result<(), Box<dyn Error>> {
    let listener = TcpListener::bind("127.0.0.1:9527").await?;

    let sender = Arc::new(Mutex::new(None));
    WS_SENDER.set(sender.clone())?;

    while let Ok((stream, _)) = listener.accept().await {
        let ws_stream = accept_async(stream).await?;

        *sender.lock().await = Some(ws_stream);
    }

    Ok(())
}

pub async fn send(message: Message) {
    if let Some(sender) = WS_SENDER.get() {
        if let Some(ws_stream) = &mut *sender.lock().await {
            if let Err(err) = ws_stream.send(message).await {
                log::error!("Failed to send WebSocket message: {}", err);
            }
        }
    }
}
