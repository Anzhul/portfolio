import { useState } from "react";

function Parent() {
  const handleNameSubmit = (name: any) => {
    console.log('Received name:', name);
  };

  return <NameForm onSubmit={handleNameSubmit} />;
}

function NameForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name); // Send data back to parent
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
      />
      <button type="submit">Submit</button>
    </form>
  );
}

export default Parent;