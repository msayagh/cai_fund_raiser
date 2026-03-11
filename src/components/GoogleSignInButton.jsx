import React, { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let googleScriptPromise;

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("GOOGLE_SCRIPT_LOAD_FAILED")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GOOGLE_SCRIPT_LOAD_FAILED"));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

export default function GoogleSignInButton({
  onCredential,
  onError,
  width = 360,
  disabled = false,
}) {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => { onCredentialRef.current = onCredential; }, [onCredential]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    let isCancelled = false;

    if (!clientId) {
      return undefined;
    }

    loadGoogleScript()
      .then(() => {
        if (isCancelled || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) {
              onErrorRef.current?.("Google did not return a credential. Please try again.");
              return;
            }
            onCredentialRef.current?.(response.credential);
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width,
          logo_alignment: "left",
        });

        setReady(true);
      })
      .catch(() => {
        if (!isCancelled) {
          onErrorRef.current?.("Failed to load Google sign-in. Please refresh and try again.");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [clientId, width]);

  return (
    <div style={{ opacity: disabled ? 0.65 : 1, pointerEvents: disabled || !ready ? "none" : "auto" }}>
      <div ref={buttonRef} />
    </div>
  );
}
