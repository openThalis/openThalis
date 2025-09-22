use tao::event_loop::{ControlFlow, EventLoop};
use tao::window::{WindowBuilder, Icon};
use wry::WebViewBuilder;
use wry::Result;
use std::{net::SocketAddr, thread};
use std::io::{Error as IoError, ErrorKind};

// --- Axum & Tokio --------------------------------------------------
use axum::{Router, serve};
use tower_http::{services::{ServeDir, ServeFile}, cors::{CorsLayer, Any}};

// --- Additional imports for new features --------------------------------------------------
use tao::event::{Event, WindowEvent};

/// Main entry point for the openThalis application
fn main() -> Result<()> {
    // 1. Load environment variables (.env is optional)
    initialize_environment();

    // 2. Start the static-file HTTP server in a background thread
    let serve_port: u16 = get_serve_port();
    let root_dir = std::env::current_dir()?;
    let addr = SocketAddr::from(([127, 0, 0, 1], serve_port));

    thread::spawn(move || {
        // Each server runs inside its own Tokio runtime
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("Failed to create Tokio runtime");
        runtime.block_on(run_static_server(addr, root_dir));
    });

    // 3. Build the Wry window & WebView that points at the local server
    let event_loop = EventLoop::new();
    let icon = load_application_icon()?;
    let window = create_main_window(&event_loop, icon)?;

    let url = format!("http://127.0.0.1:{serve_port}/");

    // Build WebView and keep it alive for the duration of the program
    let _webview = WebViewBuilder::new()
        .with_url(&url)
        .build(&window)?;

    // 4. Enter GUI event loop (never returns)
    run_event_loop(event_loop);
}

//--------------------------------------------------------------------
//  Environment helpers
//--------------------------------------------------------------------
fn initialize_environment() {
    dotenv::dotenv().ok();
}

fn get_serve_port() -> u16 {
    let rust_url = std::env::var("RUST_URL")
        .expect("rust_url environment variable not set");
    
    // Parse the URL to extract the port
    if let Some(port_start) = rust_url.rfind(':') {
        if let Some(port_end) = rust_url[port_start+1..].find('/') {
            let port_str = &rust_url[port_start+1..port_start+1+port_end];
            port_str.parse().expect("Invalid port number in rust_url")
        } else {
            // Port is at the end of the URL
            let port_str = &rust_url[port_start+1..];
            port_str.parse().expect("Invalid port number in rust_url")
        }
    } else {
        panic!("No port found in rust_url");
    }
}

//--------------------------------------------------------------------
//  Icon helpers
//--------------------------------------------------------------------
fn load_application_icon() -> Result<Icon> {
    let icon_path = get_icon_path()?;
    if !icon_path.exists() {
        panic!("Icon file not found at: {:?}", icon_path);
    }
    let (icon_rgba, icon_width, icon_height) = load_icon_image(&icon_path)?;
    Icon::from_rgba(icon_rgba, icon_width, icon_height)
        .map_err(|e| wry::Error::Io(IoError::new(ErrorKind::Other, format!("Failed to create icon: {e}"))))
}

fn get_icon_path() -> Result<std::path::PathBuf> {
    std::env::current_dir()
        .map(|dir| dir.join("src/icon.png"))
        .map_err(|e| wry::Error::Io(IoError::new(ErrorKind::Other, format!("Failed to get current directory: {e}"))))
}

fn load_icon_image(icon_path: &std::path::Path) -> Result<(Vec<u8>, u32, u32)> {
    let img = image::open(icon_path)
        .map_err(|e| wry::Error::Io(IoError::new(ErrorKind::Other, format!("Failed to load icon image: {e}"))))?
        .to_rgba8();
    let (width, height) = img.dimensions();
    Ok((img.into_raw(), width, height))
}

fn create_main_window(event_loop: &EventLoop<()>, icon: Icon) -> Result<tao::window::Window> {
    let window = WindowBuilder::new()
        .with_title("openThalis")
        .with_maximized(true)
        .with_window_icon(Some(icon))
        .build(event_loop)
        .map_err(|e| wry::Error::Io(IoError::new(ErrorKind::Other, format!("Failed to create window: {e}"))))?;
    Ok(window)
}

//--------------------------------------------------------------------
//  GUI event loop helper
//--------------------------------------------------------------------
fn run_event_loop(event_loop: EventLoop<()>) -> ! {
    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    });
}

//--------------------------------------------------------------------
//  Static-file HTTP server (Axum + Tower)
//--------------------------------------------------------------------
async fn run_static_server(addr: SocketAddr, root: std::path::PathBuf) {
    use axum::{response::Response, http::StatusCode};
    
    // Static roots
    let src_root = root.join("src");

    // Get backend URL from environment
    let backend_url = std::env::var("BACKEND_URL")
        .expect("BACKEND_URL environment variable must be set");

    // Create config.js content
    let config_js = format!("window.__BACKEND_URL__ = \"{}\";", backend_url);

    // 1. Serve "/src/*" directly from the src directory (original layout)
    let src_service = ServeDir::new(&src_root)
        .append_index_html_on_directories(true);

    // 2. Serve "/programs/*" from src/programs so HTML that omits the `/src` prefix still works
    let programs_service = ServeDir::new(src_root.join("programs"))
        .append_index_html_on_directories(true);

    // 3. Fall-back to the scaffold index.html (single-page-app behavior)
    let fallback_service = ServeFile::new(src_root.join("scaffold/index.html"));

    let app = Router::new()
        .route("/config.js", axum::routing::get(move || async move {
            Response::builder()
                .status(StatusCode::OK)
                .header("content-type", "application/javascript")
                .body(config_js.clone())
                .unwrap()
        }))
        .nest_service("/src", src_service)
        .nest_service("/programs", programs_service)
        .fallback_service(fallback_service)
        .layer(CorsLayer::new()
            .allow_methods(Any)
            .allow_origin(Any)
            .allow_headers(Any));

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind address");

    serve(listener, app)
        .await
        .expect("HTTP server crashed");
}
