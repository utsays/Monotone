import Board from "@/components/operations/Board";

export default function OperationsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tasks</h1>
          <p>Your projects & tasks — a shared workspace the whole team edits live.</p>
        </div>
      </div>
      <Board />
    </>
  );
}
