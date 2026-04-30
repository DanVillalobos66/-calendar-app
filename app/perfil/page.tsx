"use client";

import { useState, useEffect } from "react";

import { createClient } from "@supabase/supabase-js";

export default function Perfil() {

  const supabase = createClient(

    process.env.NEXT_PUBLIC_SUPABASE_URL!,

    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  );

  const [user, setUser] = useState<any>(null);

  const [name, setName] = useState("");

  useEffect(() => {

    const loadUser = async () => {

      const { data } = await supabase.auth.getUser();

      setUser(data.user);

      setName(data.user?.user_metadata?.name || "");

    };

    loadUser();

  }, []);

  const updateProfile = async () => {

    await supabase.auth.updateUser({

      data: { name },

    });

    alert("Perfil actualizado ✅");

  };

  return (

    <div className="p-10 max-w-md mx-auto">

      <h2 className="text-xl font-semibold mb-4">Perfil</h2>

      <input

        value={name}

        onChange={(e) => setName(e.target.value)}

        placeholder="Nombre"

        className="w-full border p-2 mb-4"

      />

      <button

        onClick={updateProfile}

        className="bg-green-600 text-white px-4 py-2 rounded"

      >

        Guardar

      </button>

    </div>

  );

}