const NotesLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="m-auto mt-2 max-w-7xl p-4 md:mt-0 md:p-4 lg:mt-4 lg:p-0">
      {children}
    </main>
  );
};

export default NotesLayout;
